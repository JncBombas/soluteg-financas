import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UpdateRecurringExpenseSchema } from "@/lib/validations";
import { serializeDecimals } from "@/lib/serialize";
import { parseInputDate } from "@/lib/businessDays";
import { z } from "zod";

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    const userId = session.user.id;

    const { id } = await params;
    const expense = await prisma.recurringExpense.findUnique({ where: { id } });
    if (!expense) return NextResponse.json({ error: "Despesa fixa não encontrada" }, { status: 404 });
    if (expense.userId !== userId) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const body = await req.json();
    const data = UpdateRecurringExpenseSchema.parse(body);

    const erroVinculo = await validarVinculos(userId, data);
    if (erroVinculo) return NextResponse.json({ error: erroVinculo }, { status: 400 });

    const dataToUpdate: any = { ...data };
    if (data.startDate) dataToUpdate.startDate = parseInputDate(data.startDate);
    if (data.endDate !== undefined) dataToUpdate.endDate = data.endDate ? parseInputDate(data.endDate) : null;

    const updated = await prisma.recurringExpense.update({ where: { id }, data: dataToUpdate });

    return NextResponse.json(serializeDecimals(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Erro PUT Despesa Fixa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    const userId = session.user.id;

    const { id } = await params;
    const expense = await prisma.recurringExpense.findUnique({ where: { id } });
    if (!expense) return NextResponse.json({ error: "Despesa fixa não encontrada" }, { status: 404 });
    if (expense.userId !== userId) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    // Remove lançamentos "Previstos" ainda não pagos; preserva o histórico pago
    // desvinculando-o da definição (mantém o registro financeiro).
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { recurringExpenseId: id, status: "PENDING" } }),
      prisma.transaction.updateMany({
        where: { recurringExpenseId: id },
        data: { recurringExpenseId: null, periodKey: null },
      }),
      prisma.recurringExpense.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro DELETE Despesa Fixa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
