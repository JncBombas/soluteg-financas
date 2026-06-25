import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { PushSubscriptionSchema } from "@/lib/validations";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });
    const userId = session.user.id;

    const body = await req.json();
    const data = PushSubscriptionSchema.parse(body);

    // Dedupe por endpoint (sem unique no DB por ser TEXT): remove e recria.
    const existing = await prisma.pushSubscription.findFirst({ where: { endpoint: data.endpoint } });
    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { userId, p256dh: data.keys.p256dh, auth: data.keys.auth },
      });
    } else {
      await prisma.pushSubscription.create({
        data: { endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, userId },
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Erro POST Push Subscribe:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Acesso Não Autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) return NextResponse.json({ error: "endpoint é obrigatório" }, { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro DELETE Push Subscribe:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
