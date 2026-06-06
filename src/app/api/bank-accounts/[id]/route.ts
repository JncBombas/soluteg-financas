import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { UpdateBankAccountSchema } from "@/lib/validations";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id } });

    if (!account) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (account.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const body = await request.json();
    const validatedData = UpdateBankAccountSchema.parse(body);

    const updatedAccount = await prisma.bankAccount.update({
      where: { id },
      data: validatedData
    });

    return NextResponse.json(updatedAccount);
  } catch (error: any) {
    console.error("ERRO PUT BANK ACCOUNT:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { id } = await params;
    const account = await prisma.bankAccount.findUnique({ where: { id } });

    if (!account) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (account.userId !== session.user.id) return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });

    const count = await prisma.transaction.count({ where: { bankAccountId: id } });

    if (count > 0) {
      return NextResponse.json(
        { error: `Esta conta possui ${count} transação(ões) vinculada(s) e não pode ser excluída.` },
        { status: 409 }
      );
    }

    await prisma.bankAccount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE BANK ACCOUNT:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
