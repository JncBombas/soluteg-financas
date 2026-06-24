import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { CreditCardSchema } from "@/lib/validations";
import { nextBusinessDay } from "@/lib/businessDays";
import { serializeDecimals } from "@/lib/serialize";

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

    // Pré-calcula o ciclo de cada cartão e busca as transações de todos os
    // cartões em uma única query (evita N+1). A soma da fatura é feita por
    // cartão em JS, respeitando a janela de ciclo individual.
    const ciclos = new Map(cards.map((c) => [c.id, getCicloAtual(c.closingDay)]));

    let invoiceTx: { creditCardId: string | null; date: Date; amount: Prisma.Decimal }[] = [];
    if (cards.length > 0) {
      const minStart = new Date(Math.min(...cards.map((c) => ciclos.get(c.id)!.cycleStart.getTime())));
      const maxEnd = new Date(Math.max(...cards.map((c) => ciclos.get(c.id)!.cycleEnd.getTime())));
      invoiceTx = await prisma.transaction.findMany({
        where: {
          creditCardId: { in: cards.map((c) => c.id) },
          type: "EXPENSE",
          status: { not: "CANCELLED" },
          date: { gte: minStart, lte: maxEnd }
        },
        select: { creditCardId: true, date: true, amount: true }
      });
    }

    // Soma em centavos (inteiros) para manter a fatura exata.
    const faturaCentavos = new Map<string, number>();
    for (const tx of invoiceTx) {
      if (!tx.creditCardId) continue;
      const ciclo = ciclos.get(tx.creditCardId);
      if (!ciclo || tx.date < ciclo.cycleStart || tx.date > ciclo.cycleEnd) continue;
      const cents = Math.round(Number(tx.amount) * 100);
      faturaCentavos.set(tx.creditCardId, (faturaCentavos.get(tx.creditCardId) || 0) + cents);
    }

    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();

    const cardsWithInvoice = cards.map((card) => {
      let invoiceDueDate;
      if (hoje.getDate() <= card.closingDay) {
        invoiceDueDate = new Date(ano, mes + 1, card.dueDay);
      } else {
        invoiceDueDate = new Date(ano, mes + 2, card.dueDay);
      }
      invoiceDueDate = nextBusinessDay(invoiceDueDate);

      return { ...serializeDecimals(card), currentInvoice: (faturaCentavos.get(card.id) || 0) / 100, invoiceDueDate };
    });

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

    return NextResponse.json(serializeDecimals(newCard), { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST CREDIT CARD:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
