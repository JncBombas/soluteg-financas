import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { serializeDecimals } from "@/lib/serialize";

// Janela de antecedência do alerta (em dias) — igual à usada no cron.
const ALERT_DAYS_BEFORE = 3;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });

    // Limite superior: fim do dia (hoje + 3). Inclui vencidos (sem limite inferior).
    const limite = new Date();
    limite.setDate(limite.getDate() + ALERT_DAYS_BEFORE);
    limite.setHours(23, 59, 59, 999);

    const pendentes = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
        dueDate: { lte: limite },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
      include: {
        category: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(serializeDecimals(pendentes));
  } catch (error) {
    console.error("Erro GET Notificações:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
