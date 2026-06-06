import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { UpdateCreditCardSchema } from "@/lib/validations";

function getCicloAtual(closingDay: number) {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();
  
  let cycleStart, cycleEnd;
  
  if (dia <= closingDay) {
    cycleStart = new Date(ano, mes - 1, closingDay + 1);
    cycleEnd = new Date(ano, mes, closingDay, 23, 59, 59);
  } else {
    cycleStart = new Date(ano, mes, closingDay + 1);
    cycleEnd = new Date(ano, mes + 1, closingDay, 23, 59, 59);
  }
  
  return { cycleStart, cycleEnd };
}

async function calcularFaturaAtual(cardId: string, closingDay: number) {
  const { cycleStart, cycleEnd } = getCicloAtual(closingDay);
  
  const sum = await prisma.transaction.aggregate({
    where: {
      creditCardId: cardId,
      type: "EXPENSE",
      status: { not: "CANCELLED" },
      date: { gte: cycleStart, lte: cycleEnd }
    },
    _sum: { amount: true }
  });
  
  return sum._sum.amount || 0;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const card = await prisma.creditCard.findUnique({ where: { id } });

    if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    if (card.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const { cycleStart, cycleEnd } = getCicloAtual(card.closingDay);

    const invoiceTransactions = await prisma.transaction.findMany({
      where: {
        creditCardId: id,
        status: { not: "CANCELLED" },
        date: { gte: cycleStart, lte: cycleEnd }
      },
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    const currentInvoice = await calcularFaturaAtual(card.id, card.closingDay);

    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();
    let invoiceDueDate;
    
    if (hoje.getDate() <= card.closingDay) {
      invoiceDueDate = new Date(ano, mes + 1, card.dueDay);
    } else {
      invoiceDueDate = new Date(ano, mes + 2, card.dueDay);
    }

    return NextResponse.json({
      ...card,
      currentInvoice,
      invoiceDueDate,
      cycleStart,
      cycleEnd,
      invoiceTransactions
    });
  } catch (error: any) {
    console.error("ERRO GET CREDIT CARD ID:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const card = await prisma.creditCard.findUnique({ where: { id } });

    if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    if (card.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const body = await request.json();
    const validatedData = UpdateCreditCardSchema.parse(body);

    const updatedCard = await prisma.creditCard.update({
      where: { id },
      data: validatedData
    });

    return NextResponse.json(updatedCard);
  } catch (error: any) {
    console.error("ERRO PUT CREDIT CARD:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const card = await prisma.creditCard.findUnique({ where: { id } });

    if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    if (card.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const count = await prisma.transaction.count({ where: { creditCardId: id } });

    if (count > 0) {
      return NextResponse.json(
        { error: `Este cartão possui ${count} transação(ões) vinculada(s) e não pode ser excluído.` },
        { status: 409 }
      );
    }

    await prisma.creditCard.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE CREDIT CARD:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
