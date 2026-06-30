import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NewTransactionSchema } from "@/lib/validations";
import { parseInputDate } from "@/lib/businessDays";
import { serializeDecimals } from "@/lib/serialize";
import { z } from "zod";

function calcularDueDate(date: Date, closingDay: number, dueDay: number) {
  const offset = date.getUTCDate() <= closingDay ? 1 : 2;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, dueDay, 12));
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const creditCardId = searchParams.get('creditCardId');
    const bankAccountId = searchParams.get('bankAccountId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const contextFilter = searchParams.get('context');

    const whereClause: any = { 
      userId: session.user.id,
      ...(contextFilter && contextFilter !== 'ALL' ? { context: contextFilter } : {})
    };

    if (type) whereClause.type = { equals: type };
    if (status) whereClause.status = { equals: status };
    if (paymentMethod) whereClause.paymentMethod = { equals: paymentMethod };
    if (creditCardId) whereClause.creditCardId = { equals: creditCardId };
    if (bankAccountId) whereClause.bankAccountId = { equals: bankAccountId };

    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = new Date(dateFrom);
      if (dateTo) whereClause.date.lte = new Date(dateTo);
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 200,
      include: {
        category: true,
        creditCard: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(serializeDecimals(transactions));
  } catch (error) {
    console.error("Erro GET Transações:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const data = NewTransactionSchema.parse(body);

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: "Categoria inválida ou não pertence ao usuário" }, { status: 400 });
    }

    if (data.creditCardId) {
      const card = await prisma.creditCard.findUnique({ where: { id: data.creditCardId } });
      if (!card || card.userId !== session.user.id) {
        return NextResponse.json({ error: "Cartão inválido ou não pertence ao usuário" }, { status: 400 });
      }
    }

    if (data.bankAccountId) {
      const account = await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } });
      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Conta inválida ou não pertence ao usuário" }, { status: 400 });
      }
    }

    if (data.transactionMode === "SINGLE") {
      const purchaseDate = parseInputDate(data.date);
      const today = new Date();
      const status = purchaseDate <= today ? "PAID" : "PENDING";
      const paidAt = status === "PAID" ? purchaseDate : null;

      const transaction = await prisma.transaction.create({
        data: {
          amount: data.amount,
          description: data.description,
          type: data.type,
          paymentMethod: data.paymentMethod,
          date: purchaseDate,
          dueDate: purchaseDate, // fallback pra SINGLE é ela mesma
          status,
          paidAt,
          notes: data.notes || null,
          fee: data.fee || null,
          creditCardId: data.creditCardId || null,
          bankAccountId: data.bankAccountId || null,
          categoryId: data.categoryId,
          userId: session.user.id,
        }
      });

      return NextResponse.json(serializeDecimals(transaction), { status: 201 });
    }

    if (data.transactionMode === "INSTALLMENT") {
      if (!data.installments) return NextResponse.json({ error: "Número de parcelas obrigatório" }, { status: 400 });
      
      // Distribui o valor em centavos para evitar erro de arredondamento de
      // float: cada parcela recebe a base arredondada e a última absorve a
      // sobra, garantindo que a soma das parcelas seja exatamente o total.
      const totalCents = Math.round(data.amount * 100);
      const baseCents = Math.floor(totalCents / data.installments);
      const installmentCents = (i: number) =>
        i === data.installments! - 1
          ? totalCents - baseCents * (data.installments! - 1)
          : baseCents;
      const purchaseDate = parseInputDate(data.date);

      let cardData = null;
      if (data.paymentMethod === "CREDIT" && data.creditCardId) {
        cardData = await prisma.creditCard.findUnique({ where: { id: data.creditCardId } });
      }

      const group = await prisma.$transaction(async (tx) => {
        const createdGroup = await tx.transactionGroup.create({
          data: {
            description: data.description,
            groupType: "INSTALLMENT",
            transactionType: data.type,
            paymentMethod: data.paymentMethod,
            totalAmount: data.amount,
            occurrences: data.installments!,
            startDate: purchaseDate,
            creditCardId: data.creditCardId || null,
            bankAccountId: data.bankAccountId || null,
            categoryId: data.categoryId,
            userId: userId,
            notes: data.notes || null
          }
        });

        // Primeiro vencimento (boleto/pix/etc.): o próximo dia `dueDay` em ou
        // após a data da compra. Sem isso, comprar dia 29 com vencimento dia 5
        // geraria a 1ª parcela vencida no dia 5 do mês corrente (no passado).
        const baseVenc = new Date(purchaseDate);
        if (data.dueDay) {
          baseVenc.setDate(data.dueDay);
          if (baseVenc < purchaseDate) baseVenc.setMonth(baseVenc.getMonth() + 1);
        }

        const installmentsData = [];
        for (let i = 0; i < data.installments!; i++) {
          const installDate = new Date(purchaseDate);
          installDate.setMonth(installDate.getMonth() + i);

          let dueDate;
          if (data.paymentMethod === "CREDIT" && cardData) {
            dueDate = calcularDueDate(installDate, cardData.closingDay, cardData.dueDay);
          } else if (data.dueDay) {
            dueDate = new Date(baseVenc);
            dueDate.setMonth(baseVenc.getMonth() + i);
          } else {
            dueDate = new Date(installDate);
          }

          installmentsData.push({
            amount: installmentCents(i) / 100,
            description: data.description,
            date: installDate,
            dueDate,
            type: data.type,
            paymentMethod: data.paymentMethod,
            status: "PENDING",
            paidAt: null,
            fee: null,
            creditCardId: data.creditCardId || null,
            bankAccountId: data.bankAccountId || null,
            transactionGroupId: createdGroup.id,
            occurrenceNumber: i + 1,
            occurrenceTotal: data.installments!,
            categoryId: data.categoryId,
            userId: userId,
            notes: data.notes || null
          });
        }

        await tx.transaction.createMany({ data: installmentsData });
        return createdGroup;
      });

      return NextResponse.json({ group: serializeDecimals(group), message: `${data.installments} parcelas criadas` }, { status: 201 });
    }

    if (data.transactionMode === "RECURRING") {
      if (!data.occurrences || !data.frequency) return NextResponse.json({ error: "Ocorrências e Frequência são obrigatórios" }, { status: 400 });

      const startDate = parseInputDate(data.date);
      const today = new Date();

      const group = await prisma.$transaction(async (tx) => {
        const createdGroup = await tx.transactionGroup.create({
          data: {
            description: data.description,
            groupType: "RECURRING",
            transactionType: data.type,
            paymentMethod: data.paymentMethod,
            totalAmount: data.amount,
            occurrences: data.occurrences!,
            dueDay: data.dueDay || null,
            startDate,
            creditCardId: data.creditCardId || null,
            bankAccountId: data.bankAccountId || null,
            categoryId: data.categoryId,
            userId: userId,
            notes: data.notes || null
          }
        });

        // Primeiro vencimento mensal: próximo dia `dueDay` em ou após a data de
        // início, para a 1ª ocorrência não cair no passado (ex.: início dia 29,
        // vencimento dia 5 cairia no dia 5 do mês corrente).
        const baseVenc = new Date(startDate);
        if (data.dueDay) {
          baseVenc.setDate(data.dueDay);
          if (baseVenc < startDate) baseVenc.setMonth(baseVenc.getMonth() + 1);
        }

        const occurrencesData = [];
        for (let i = 0; i < data.occurrences!; i++) {
          let dueDate = new Date(startDate);

          if (data.frequency === "MONTHLY") {
            if (data.dueDay) {
              dueDate = new Date(baseVenc);
              dueDate.setMonth(baseVenc.getMonth() + i);
            } else {
              dueDate.setMonth(dueDate.getMonth() + i);
            }
          } else if (data.frequency === "WEEKLY") {
            dueDate.setDate(dueDate.getDate() + i * 7);
          } else if (data.frequency === "YEARLY") {
            dueDate.setFullYear(dueDate.getFullYear() + i);
          }

          const status = dueDate <= today ? "PAID" : "PENDING";
          const paidAt = status === "PAID" ? dueDate : null;

          occurrencesData.push({
            amount: data.amount,
            description: data.description,
            date: dueDate,
            dueDate,
            type: data.type,
            paymentMethod: data.paymentMethod,
            status,
            paidAt,
            creditCardId: data.creditCardId || null,
            bankAccountId: data.bankAccountId || null,
            transactionGroupId: createdGroup.id,
            occurrenceNumber: i + 1,
            occurrenceTotal: data.occurrences!,
            categoryId: data.categoryId,
            userId: userId,
            notes: data.notes || null
          });
        }

        await tx.transaction.createMany({ data: occurrencesData });
        return createdGroup;
      });

      return NextResponse.json({ group: serializeDecimals(group), message: `${data.occurrences} ocorrências criadas` }, { status: 201 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Erro POST Transações:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
