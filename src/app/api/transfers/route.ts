import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

const TransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().default("Transferência entre contas"),
  notes: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const body = await request.json();
    const data = TransferSchema.parse(body);

    if (data.fromAccountId === data.toAccountId) {
      return NextResponse.json({ error: "Conta de origem e destino não podem ser iguais" }, { status: 400 });
    }

    const fromAccount = await prisma.bankAccount.findUnique({ where: { id: data.fromAccountId } });
    const toAccount = await prisma.bankAccount.findUnique({ where: { id: data.toAccountId } });

    if (!fromAccount || !toAccount || fromAccount.userId !== session.user.id || toAccount.userId !== session.user.id) {
      return NextResponse.json({ error: "Contas não encontradas ou não pertencem ao usuário" }, { status: 403 });
    }

    const transferId = crypto.randomUUID();
    const parsedDate = new Date(data.date + "T12:00:00.000Z");

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          description: data.description,
          amount: data.amount,
          type: "EXPENSE",
          paymentMethod: "TRANSFER",
          status: "PAID",
          paidAt: parsedDate,
          bankAccountId: data.fromAccountId,
          date: parsedDate,
          transferId,
          context: fromAccount.context
        }
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          description: data.description,
          amount: data.amount,
          type: "INCOME",
          paymentMethod: "TRANSFER",
          status: "PAID",
          paidAt: parsedDate,
          bankAccountId: data.toAccountId,
          date: parsedDate,
          transferId,
          context: toAccount.context
        }
      })
    ]);

    return NextResponse.json({ success: true, transferId }, { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST TRANSFER:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('transferId');

    if (!transferId) {
      return NextResponse.json({ error: "transferId é obrigatório" }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { transferId }
    });

    if (transactions.length === 0) {
      return NextResponse.json({ error: "Transferência não encontrada" }, { status: 404 });
    }

    const allBelongToUser = transactions.every(t => t.userId === session.user!.id);
    if (!allBelongToUser) {
      return NextResponse.json({ error: "Sem permissão para deletar esta transferência" }, { status: 403 });
    }

    await prisma.$transaction(
      transactions.map(t => prisma.transaction.delete({ where: { id: t.id } }))
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE TRANSFER:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
