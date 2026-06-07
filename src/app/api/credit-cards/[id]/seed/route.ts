import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { nextBusinessDay } from "@/lib/businessDays";

const SeedSchema = z.object({
  currentInvoice: z.number().min(0).optional(),
  installments: z.array(z.object({
    description: z.string().min(1),
    totalAmount: z.number().positive(),
    currentInstallmentNumber: z.number().int().min(1),
    remainingInstallments: z.number().int().min(1)
  })).optional()
});

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await context.params;

    const card = await prisma.creditCard.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    if (card.userId !== session.user.id) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const body = await request.json();
    const data = SeedSchema.parse(body);

    const hoje = new Date();
    let baseMonth = hoje.getMonth();
    const baseYear = hoje.getFullYear();
    if (hoje.getDate() > card.closingDay) {
      baseMonth += 1;
    }

    if (data.currentInvoice && data.currentInvoice > 0) {
      const dueDate = nextBusinessDay(new Date(baseYear, baseMonth + 1, card.dueDay));
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          description: "Fatura em aberto (saldo inicial)",
          amount: data.currentInvoice,
          type: "EXPENSE",
          paymentMethod: "CREDIT",
          status: "PENDING",
          creditCardId: id,
          date: new Date(),
          dueDate: dueDate,
          context: card.context
        }
      });
    }

    if (data.installments && data.installments.length > 0) {
      for (const installment of data.installments) {
        const totalInstallments = installment.currentInstallmentNumber + installment.remainingInstallments - 1;
        
        const group = await prisma.transactionGroup.create({
          data: {
            userId: session.user.id,
            description: installment.description,
            groupType: "INSTALLMENT",
            transactionType: "EXPENSE",
            paymentMethod: "CREDIT",
            totalAmount: installment.totalAmount,
            occurrences: totalInstallments,
            creditCardId: id,
            context: card.context,
            categoryId: null,
            startDate: new Date()
          }
        });

        const transactionsData = [];
        for (let i = 0; i < installment.remainingInstallments; i++) {
          const occurrenceNum = installment.currentInstallmentNumber + i;
          const dueDate = nextBusinessDay(new Date(baseYear, baseMonth + 1 + i, card.dueDay));
          const amount = installment.totalAmount / totalInstallments;

          transactionsData.push({
            userId: session.user.id,
            description: installment.description,
            amount: amount,
            type: "EXPENSE",
            paymentMethod: "CREDIT",
            status: "PENDING",
            creditCardId: id,
            date: new Date(),
            dueDate: dueDate,
            transactionGroupId: group.id,
            occurrenceNumber: occurrenceNum,
            occurrenceTotal: totalInstallments,
            context: card.context
          });
        }

        await prisma.transaction.createMany({
          data: transactionsData
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST SEED CARD:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
