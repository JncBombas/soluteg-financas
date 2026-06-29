import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";

// Projeção de fluxo futuro. Combina transações fixas ativas
// (RecurringTransaction) com lançamentos futuros já cadastrados
// (Transaction com vencimento dentro da janela), sem dupla contagem:
// lançamentos já materializados de uma fixa (recurringTransactionId != null)
// são ignorados, pois a própria fixa já os projeta.
const MAX_MONTHS = 24;
const DEFAULT_MONTHS = 12;

const QuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(MAX_MONTHS).catch(DEFAULT_MONTHS),
});

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}
function monthLabel(year: number, monthIndex: number): string {
  return `${MESES_ABREV[monthIndex]}/${String(year).slice(2)}`;
}

// Quantas ocorrências de uma fixa caem em um mês (year/monthIndex).
function ocorrenciasNoMes(exp: any, year: number, monthIndex: number): number {
  const start = new Date(exp.startDate);
  const startFloor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const end = exp.endDate ? new Date(exp.endDate).getTime() : null;
  const dueDay = Math.min(Math.max(exp.dueDay, 1), 28);

  if (exp.frequency === "MONTHLY" || exp.frequency === "YEARLY") {
    if (exp.frequency === "YEARLY" && monthIndex !== start.getUTCMonth()) return 0;
    const nominal = Date.UTC(year, monthIndex, dueDay, 12);
    if (nominal < startFloor) return 0;
    if (end && nominal > end) return 0;
    return 1;
  }

  if (exp.frequency === "WEEKLY") {
    const weekday = start.getUTCDay();
    const diasNoMes = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    let count = 0;
    for (let d = 1; d <= diasNoMes; d++) {
      const cur = Date.UTC(year, monthIndex, d, 12);
      if (new Date(cur).getUTCDay() === weekday && cur >= startFloor && (!end || cur <= end)) count++;
    }
    return count;
  }
  return 0;
}

type Bucket = { income: number; expense: number };
function novoBucket(): Bucket {
  return { income: 0, expense: 0 };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const { months } = QuerySchema.parse({ months: searchParams.get("months") });

    // Janela: do primeiro dia do mês atual até o fim do mês (atual + months - 1).
    const agora = new Date();
    const baseYear = agora.getUTCFullYear();
    const baseMonth = agora.getUTCMonth();
    const janelaInicio = new Date(Date.UTC(baseYear, baseMonth, 1, 0, 0, 0));
    const janelaFim = new Date(Date.UTC(baseYear, baseMonth + months, 0, 23, 59, 59));

    // Estrutura de meses da janela.
    const meses = [] as { key: string; label: string; year: number; monthIndex: number }[];
    for (let i = 0; i < months; i++) {
      const dt = new Date(Date.UTC(baseYear, baseMonth + i, 1));
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth();
      meses.push({ key: monthKey(y, m), label: monthLabel(y, m), year: y, monthIndex: m });
    }
    const indicePorKey = new Map(meses.map((mes, idx) => [mes.key, idx]));

    // Acumuladores: por mês → { PF: bucket, PJ: bucket }.
    const acc = meses.map(() => ({ PF: novoBucket(), PJ: novoBucket() }));

    const [fixas, futuros] = await Promise.all([
      prisma.recurringTransaction.findMany({ where: { userId, isActive: true } }),
      prisma.transaction.findMany({
        where: {
          userId,
          recurringTransactionId: null,
          status: { not: "CANCELLED" },
          OR: [
            { dueDate: { gte: janelaInicio, lte: janelaFim } },
            { AND: [{ dueDate: null }, { date: { gte: janelaInicio, lte: janelaFim } }] },
          ],
        },
        select: { amount: true, type: true, context: true, date: true, dueDate: true },
      }),
    ]);

    // 1) Projeção das fixas ativas mês a mês.
    for (const exp of fixas) {
      const ctx = exp.context === "PJ" ? "PJ" : "PF";
      const tipo = exp.type === "INCOME" ? "income" : "expense";
      const valor = Number(exp.amount);
      for (let idx = 0; idx < meses.length; idx++) {
        const { year, monthIndex } = meses[idx];
        const n = ocorrenciasNoMes(exp, year, monthIndex);
        if (n > 0) acc[idx][ctx][tipo] += valor * n;
      }
    }

    // 2) Lançamentos futuros já cadastrados (parcelamentos, avulsos), sem dupla contagem.
    for (const t of futuros) {
      const alvo = t.dueDate ?? t.date;
      const dt = new Date(alvo);
      const idx = indicePorKey.get(monthKey(dt.getUTCFullYear(), dt.getUTCMonth()));
      if (idx === undefined) continue;
      const ctx = t.context === "PJ" ? "PJ" : "PF";
      const tipo = t.type === "INCOME" ? "income" : "expense";
      acc[idx][ctx][tipo] += Number(t.amount);
    }

    const data = meses.map((mes, idx) => ({
      month: mes.key,
      label: mes.label,
      PF: acc[idx].PF,
      PJ: acc[idx].PJ,
    }));

    return NextResponse.json({ months, data });
  } catch (error) {
    console.error("Erro GET Projeções:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
