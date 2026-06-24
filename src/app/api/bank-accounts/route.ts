import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BankAccountSchema } from "@/lib/validations";
import { serializeDecimals } from "@/lib/serialize";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contextFilter = searchParams.get('context');

    const whereClause: any = {
      userId: session.user.id,
      ...(contextFilter && contextFilter !== 'ALL' ? { context: contextFilter } : {})
    };

    const accounts = await prisma.bankAccount.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    // Saldo de todas as contas em uma única query (evita N+1).
    const accountIds = accounts.map((acc) => acc.id);
    const sums = accountIds.length > 0
      ? await prisma.transaction.groupBy({
          by: ['bankAccountId', 'type'],
          where: { bankAccountId: { in: accountIds }, status: 'PAID' },
          _sum: { amount: true }
        })
      : [];

    const saldoPorConta = new Map<string, number>();
    for (const s of sums) {
      if (!s.bankAccountId) continue;
      const delta = (s.type === 'INCOME' ? 1 : -1) * Number(s._sum.amount || 0);
      saldoPorConta.set(s.bankAccountId, (saldoPorConta.get(s.bankAccountId) || 0) + delta);
    }

    const accountsWithBalance = accounts.map((acc) => ({
      ...serializeDecimals(acc),
      currentBalance: Number(acc.initialBalance) + (saldoPorConta.get(acc.id) || 0)
    }));

    return NextResponse.json(accountsWithBalance);
  } catch (error: any) {
    console.error("ERRO GET BANK ACCOUNTS:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const body = await request.json();
    const validatedData = BankAccountSchema.parse(body);

    const newAccount = await prisma.bankAccount.create({
      data: {
        ...validatedData,
        userId: session.user.id
      }
    });

    return NextResponse.json(serializeDecimals(newAccount), { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST BANK ACCOUNT:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
