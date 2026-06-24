import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UpdateTransactionSchema } from "@/lib/validations";
import { parseInputDate } from "@/lib/businessDays";
import { serializeDecimals } from "@/lib/serialize";
import { z } from "zod";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        creditCard: true,
        bankAccount: true,
        transactionGroup: true
      }
    });

    if (!transaction) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    if (transaction.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    return NextResponse.json(serializeDecimals(transaction));
  } catch (error) {
    console.error("ERRO GET TRANSACTION ID:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    if (transaction.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    let updatedTx;
    if (action === "PAY") {
      updatedTx = await prisma.transaction.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date() }
      });
    } else if (action === "UNPAY") {
      updatedTx = await prisma.transaction.update({
        where: { id },
        data: { status: "PENDING", paidAt: null }
      });
    } else {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    return NextResponse.json(serializeDecimals(updatedTx));
  } catch (error) {
    console.error("ERRO PATCH TRANSACTION:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    if (transaction.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const body = await req.json();
    const validatedData = UpdateTransactionSchema.parse(body);
    const { editScope = "SINGLE", ...updateFields } = validatedData;

    if (updateFields.creditCardId) {
      const card = await prisma.creditCard.findUnique({ where: { id: updateFields.creditCardId } });
      if (!card || card.userId !== session.user.id) {
        return NextResponse.json({ error: "Cartão inválido ou não pertence ao usuário" }, { status: 400 });
      }
    }

    if (updateFields.bankAccountId) {
      const account = await prisma.bankAccount.findUnique({ where: { id: updateFields.bankAccountId } });
      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Conta inválida ou não pertence ao usuário" }, { status: 400 });
      }
    }

    if (updateFields.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: updateFields.categoryId } });
      if (!category || category.userId !== session.user.id) {
        return NextResponse.json({ error: "Categoria inválida ou não pertence ao usuário" }, { status: 400 });
      }
    }

    const dataToUpdate: any = { ...updateFields };
    if (dataToUpdate.date) dataToUpdate.date = parseInputDate(dataToUpdate.date);
    if (dataToUpdate.dueDate) dataToUpdate.dueDate = parseInputDate(dataToUpdate.dueDate);

    if (editScope === "SINGLE" || !transaction.transactionGroupId) {
      await prisma.transaction.update({ where: { id }, data: dataToUpdate });
    } else if (editScope === "THIS_AND_FOLLOWING") {
      await prisma.transaction.updateMany({
        where: {
          transactionGroupId: transaction.transactionGroupId,
          occurrenceNumber: { gte: transaction.occurrenceNumber || 0 }
        },
        data: dataToUpdate
      });
    } else if (editScope === "ALL") {
      await prisma.transaction.updateMany({
        where: { transactionGroupId: transaction.transactionGroupId },
        data: dataToUpdate
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("ERRO PUT TRANSACTION:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    if (transaction.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERRO DELETE TRANSACTION:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
