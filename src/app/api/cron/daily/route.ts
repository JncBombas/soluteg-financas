import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nextBusinessDay } from "@/lib/businessDays";
import { sendPushToUser } from "@/lib/push";

// Janela de materialização (dias) e antecedência do alerta (dias).
const MATERIALIZE_WINDOW_DAYS = 30;
const ALERT_DAYS_BEFORE = 3;

// Data ao meio-dia UTC (convenção do projeto, evita off-by-one por fuso).
function noonUTC(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}
function isoDay(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Gera as datas nominais de vencimento de uma despesa dentro da janela.
function gerarVencimentos(expense: any, hoje: Date, fim: Date): Date[] {
  const out: Date[] = [];
  const start = new Date(expense.startDate);
  const end = expense.endDate ? new Date(expense.endDate) : null;
  const dueDay = Math.min(Math.max(expense.dueDay, 1), 28);

  const dentro = (d: Date) =>
    d.getTime() >= hoje.getTime() && d.getTime() <= fim.getTime() &&
    d.getTime() >= noonUTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()).getTime() &&
    (!end || d.getTime() <= end.getTime());

  if (expense.frequency === "MONTHLY") {
    for (let m = 0; m <= 2; m++) {
      const d = noonUTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + m, dueDay);
      if (dentro(d)) out.push(d);
    }
  } else if (expense.frequency === "YEARLY") {
    const mes = start.getUTCMonth();
    for (let y = 0; y <= 1; y++) {
      const d = noonUTC(hoje.getUTCFullYear() + y, mes, dueDay);
      if (dentro(d)) out.push(d);
    }
  } else if (expense.frequency === "WEEKLY") {
    const weekday = start.getUTCDay();
    const cursor = new Date(hoje);
    for (let i = 0; i <= MATERIALIZE_WINDOW_DAYS; i++) {
      const d = noonUTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate());
      if (d.getUTCDay() === weekday && dentro(d)) out.push(d);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return out;
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

async function autorizar(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const { searchParams } = new URL(req.url);
  return searchParams.get("secret") === secret;
}

async function executar() {
  const agora = new Date();
  const hoje = noonUTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  const fim = new Date(hoje.getTime() + MATERIALIZE_WINDOW_DAYS * 86400000);

  // 1) Materialização das transações fixas ativas.
  let materializadas = 0;
  const expenses = await prisma.recurringTransaction.findMany({ where: { isActive: true } });

  for (const exp of expenses) {
    const vencimentos = gerarVencimentos(exp, hoje, fim);
    for (const nominal of vencimentos) {
      const periodKey = isoDay(nominal);
      const existe = await prisma.transaction.findFirst({
        where: { recurringTransactionId: exp.id, periodKey },
        select: { id: true },
      });
      if (existe) continue;

      const dueDate = nextBusinessDay(nominal);
      await prisma.transaction.create({
        data: {
          amount: exp.amount,
          description: exp.description,
          date: dueDate,
          dueDate,
          type: exp.type,
          paymentMethod: exp.paymentMethod,
          status: "PENDING",
          isEstimated: exp.isVariable,
          context: exp.context,
          categoryId: exp.categoryId,
          bankAccountId: exp.bankAccountId,
          creditCardId: exp.creditCardId,
          recurringTransactionId: exp.id,
          periodKey,
          userId: exp.userId,
        },
      });
      materializadas++;
    }
  }

  // 2) Alertas de vencimento (3 dias antes e no dia) — transações fixas e avulsos.
  const inicioHoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 0, 0, 0));
  const fimHoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 23, 59, 59, 999));
  const inicioAntes = new Date(inicioHoje.getTime() + ALERT_DAYS_BEFORE * 86400000);
  const fimAntes = new Date(fimHoje.getTime() + ALERT_DAYS_BEFORE * 86400000);

  let alertasEnviados = 0;

  // 2a) Alerta de antecedência (hoje + N dias).
  const antes = await prisma.transaction.findMany({
    where: { status: "PENDING", alertBeforeSentAt: null, dueDate: { gte: inicioAntes, lte: fimAntes } },
  });
  for (const t of antes) {
    const enviados = await sendPushToUser(t.userId, {
      title: "Vencimento em 3 dias",
      body: `${t.description} — ${formatBRL(Number(t.amount))}${t.isEstimated ? " (revisar valor)" : ""}`,
      url: "/transactions",
      tag: `before-${t.id}`,
    });
    if (enviados > 0) alertasEnviados++;
    await prisma.transaction.update({ where: { id: t.id }, data: { alertBeforeSentAt: new Date() } });
  }

  // 2b) Alerta no dia do vencimento.
  const noDia = await prisma.transaction.findMany({
    where: { status: "PENDING", alertDueSentAt: null, dueDate: { gte: inicioHoje, lte: fimHoje } },
  });
  for (const t of noDia) {
    const enviados = await sendPushToUser(t.userId, {
      title: "Vence hoje",
      body: `${t.description} — ${formatBRL(Number(t.amount))}${t.isEstimated ? " (revisar valor)" : ""}`,
      url: "/transactions",
      tag: `due-${t.id}`,
    });
    if (enviados > 0) alertasEnviados++;
    await prisma.transaction.update({ where: { id: t.id }, data: { alertDueSentAt: new Date() } });
  }

  return { materializadas, alertasEnviados, transacoesAtivas: expenses.length };
}

export async function GET(req: Request) {
  if (!(await autorizar(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const resultado = await executar();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error("Erro CRON daily:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const POST = GET;
