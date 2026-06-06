import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { UpdateCategorySchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    if (category.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = UpdateCategorySchema.parse(body);

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: validatedData
    });

    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error("ERRO PUT CATEGORY:", error);
    return NextResponse.json({ error: error.message || "Erro Interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    if (category.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
    }

    const txCount = await prisma.transaction.count({
      where: { categoryId: id }
    });

    if (txCount > 0) {
      return NextResponse.json(
        { error: `Esta categoria possui ${txCount} transação(ões) vinculada(s) e não pode ser excluída.` },
        { status: 409 }
      );
    }

    await prisma.category.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE CATEGORY:", error);
    return NextResponse.json({ error: error.message || "Erro Interno" }, { status: 500 });
  }
}
