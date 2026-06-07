import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CreditCardSchema } from "@/lib/validations";
import { nextBusinessDay } from "@/lib/businessDays";

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

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contextFilter = searchParams.get('context');

    const whereClause: any = { 
      userId: session.user.id, 
      isActive: true,
      ...(contextFilter && contextFilter !== 'ALL' ? { context: contextFilter } : {})
    };

    const cards = await prisma.creditCard.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    const cardsWithInvoice = await Promise.all(
      cards.map(async (card) => {
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
        invoiceDueDate = nextBusinessDay(invoiceDueDate);
        
        return { ...card, currentInvoice, invoiceDueDate };
      })
    );

    return NextResponse.json(cardsWithInvoice);
  } catch (error: any) {
    console.error("ERRO GET CREDIT CARDS:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const body = await request.json();
    const validatedData = CreditCardSchema.parse(body);

    const newCard = await prisma.creditCard.create({
      data: {
        ...validatedData,
        userId: session.user.id
      }
    });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST CREDIT CARD:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
