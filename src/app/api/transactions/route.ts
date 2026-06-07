import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NewTransactionSchema } from "@/lib/validations";
import { z } from "zod";

function calcularDueDate(date: Date, closingDay: number, dueDay: number) {
  if (date.getDate() <= closingDay) {
    return new Date(date.getFullYear(), date.getMonth() + 1, dueDay);
  } else {
    return new Date(date.getFullYear(), date.getMonth() + 2, dueDay);
  }
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

    return NextResponse.json(transactions);
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

    const body = await req.json();
    const data = NewTransactionSchema.parse(body);

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: "Categoria inválida ou não pertence ao usuário" }, { status: 400 });
    }

    if (data.transactionMode === "SINGLE") {
      const purchaseDate = new Date(data.date);
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

      return NextResponse.json(transaction, { status: 201 });
    }

    if (data.transactionMode === "INSTALLMENT") {
      if (!data.installments) return NextResponse.json({ error: "Número de parcelas obrigatório" }, { status: 400 });
      
      const installmentAmount = data.amount / data.installments;
      const purchaseDate = new Date(data.date);

      const group = await prisma.transactionGroup.create({
        data: {
          description: data.description,
          groupType: "INSTALLMENT",
          transactionType: data.type,
          paymentMethod: data.paymentMethod,
          totalAmount: data.amount,
          occurrences: data.installments,
          startDate: purchaseDate,
          creditCardId: data.creditCardId || null,
          bankAccountId: data.bankAccountId || null,
          categoryId: data.categoryId,
          userId: session.user.id,
          notes: data.notes || null
        }
      });

      let cardData = null;
      if (data.paymentMethod === "CREDIT" && data.creditCardId) {
        cardData = await prisma.creditCard.findUnique({ where: { id: data.creditCardId } });
      }

      for (let i = 0; i < data.installments; i++) {
        const installDate = new Date(purchaseDate);
        installDate.setMonth(installDate.getMonth() + i);

        let dueDate;
        if (data.paymentMethod === "CREDIT" && cardData) {
          dueDate = calcularDueDate(installDate, cardData.closingDay, cardData.dueDay);
        } else {
          dueDate = new Date(installDate);
          if (data.dueDay) dueDate.setDate(data.dueDay);
        }

        await prisma.transaction.create({
          data: {
            amount: installmentAmount,
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
            transactionGroupId: group.id,
            occurrenceNumber: i + 1,
            occurrenceTotal: data.installments,
            categoryId: data.categoryId,
            userId: session.user.id,
            notes: data.notes || null
          }
        });
      }

      return NextResponse.json({ group, message: `${data.installments} parcelas criadas` }, { status: 201 });
    }

    if (data.transactionMode === "RECURRING") {
      if (!data.occurrences || !data.frequency) return NextResponse.json({ error: "Ocorrências e Frequência são obrigatórios" }, { status: 400 });

      const startDate = new Date(data.date);

      const group = await prisma.transactionGroup.create({
        data: {
          description: data.description,
          groupType: "RECURRING",
          transactionType: data.type,
          paymentMethod: data.paymentMethod,
          totalAmount: data.amount,
          occurrences: data.occurrences,
          dueDay: data.dueDay || null,
          startDate,
          creditCardId: data.creditCardId || null,
          bankAccountId: data.bankAccountId || null,
          categoryId: data.categoryId,
          userId: session.user.id,
          notes: data.notes || null
        }
      });

      const today = new Date();
      for (let i = 0; i < data.occurrences; i++) {
        const dueDate = new Date(startDate);
        
        if (data.frequency === "MONTHLY") {
          dueDate.setMonth(dueDate.getMonth() + i);
          if (data.dueDay) dueDate.setDate(data.dueDay);
        } else if (data.frequency === "WEEKLY") {
          dueDate.setDate(dueDate.getDate() + i * 7);
        } else if (data.frequency === "YEARLY") {
          dueDate.setFullYear(dueDate.getFullYear() + i);
        }

        const status = dueDate <= today ? "PAID" : "PENDING";
        const paidAt = status === "PAID" ? dueDate : null;

        await prisma.transaction.create({
          data: {
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
            transactionGroupId: group.id,
            occurrenceNumber: i + 1,
            occurrenceTotal: data.occurrences,
            categoryId: data.categoryId,
            userId: session.user.id,
            notes: data.notes || null
          }
        });
      }

      return NextResponse.json({ group, message: `${data.occurrences} ocorrências criadas` }, { status: 201 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.errors }, { status: 400 });
    }
    console.error("Erro POST Transações:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
