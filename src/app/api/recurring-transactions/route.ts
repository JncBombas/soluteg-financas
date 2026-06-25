import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { RecurringTransactionSchema } from "@/lib/validations";
import { serializeDecimals } from "@/lib/serialize";
import { parseInputDate } from "@/lib/businessDays";
import { z } from "zod";

// Valida que os IDs referenciados (categoria/conta/cartão) pertencem ao usuário.
async function validarVinculos(
  userId: string,
  data: { categoryId?: string | null; bankAccountId?: string | null; creditCardId?: string | null }
): Promise<string | null> {
  if (data.categoryId) {
    const c = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!c || c.userId !== userId) return "Categoria inválida ou não pertence ao usuário";
  }
  if (data.bankAccountId) {
    const b = await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } });
    if (!b || b.userId !== userId) return "Conta inválida ou não pertence ao usuário";
  }
  if (data.creditCardId) {
    const cc = await prisma.creditCard.findUnique({ where: { id: data.creditCardId } });
    if (!cc || cc.userId !== userId) return "Cartão inválido ou não pertence ao usuário";
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contextFilter = searchParams.get("context");

    const whereClause: any = {
      userId: session.user.id,
      ...(contextFilter && contextFilter !== "ALL" ? { context: contextFilter } : {}),
    };

    const expenses = await prisma.recurringTransaction.findMany({
      where: whereClause,
      orderBy: [{ isActive: "desc" }, { dueDay: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        bankAccount: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(serializeDecimals(expenses));
  } catch (error) {
    console.error("Erro GET Transações Fixas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    const userId = session.user.id;

    const body = await req.json();
    const data = RecurringTransactionSchema.parse(body);

    const erroVinculo = await validarVinculos(userId, data);
    if (erroVinculo) return NextResponse.json({ error: erroVinculo }, { status: 400 });

    const expense = await prisma.recurringTransaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        isVariable: data.isVariable,
        paymentMethod: data.paymentMethod,
        dueDay: data.dueDay,
        frequency: data.frequency,
        startDate: parseInputDate(data.startDate),
        endDate: data.endDate ? parseInputDate(data.endDate) : null,
        isActive: data.isActive,
        context: data.context,
        categoryId: data.categoryId || null,
        bankAccountId: data.bankAccountId || null,
        creditCardId: data.creditCardId || null,
        userId,
      },
    });

    return NextResponse.json(serializeDecimals(expense), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Erro POST Transação Fixa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
