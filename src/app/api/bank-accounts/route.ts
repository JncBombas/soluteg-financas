import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BankAccountSchema } from "@/lib/validations";

async function calcularSaldo(accountId: string, initialBalance: number) {
  const transactions = await prisma.transaction.groupBy({
    by: ['type'],
    where: { bankAccountId: accountId, status: 'PAID' },
    _sum: { amount: true }
  });

  let somaIncome = 0;
  let somaExpense = 0;

  for (const t of transactions) {
    if (t.type === 'INCOME') somaIncome += t._sum.amount || 0;
    if (t.type === 'EXPENSE') somaExpense += t._sum.amount || 0;
  }

  return initialBalance + somaIncome - somaExpense;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });

    const accounts = await prisma.bankAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' }
    });

    const accountsWithBalance = await Promise.all(
      accounts.map(async (acc) => {
        const currentBalance = await calcularSaldo(acc.id, acc.initialBalance);
        return { ...acc, currentBalance };
      })
    );

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

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST BANK ACCOUNT:", error);
    return NextResponse.json({ error: "Erro Interno" }, { status: 500 });
  }
}
