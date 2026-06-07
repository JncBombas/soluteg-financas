import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CategorySchema } from "@/lib/validations";

const DEFAULT_CATEGORIES = [
  // Receitas
  { name: "Salário", type: "INCOME", nature: "FIXED", context: "PERSONAL", group: "Renda", isDefault: true },
  { name: "Aposentadoria", type: "INCOME", nature: "FIXED", context: "PERSONAL", group: "Renda", isDefault: true },
  { name: "Aluguel Recebido", type: "INCOME", nature: "FIXED", context: "PERSONAL", group: "Renda", isDefault: true },
  { name: "Freelance", type: "INCOME", nature: "VARIABLE", context: "PERSONAL", group: "Renda", isDefault: true },
  { name: "Venda de Produtos", type: "INCOME", nature: "VARIABLE", context: "PERSONAL", group: "Renda", isDefault: true },
  { name: "Rendimento de Investimentos", type: "INCOME", nature: "VARIABLE", context: "PERSONAL", group: "Investimentos", isDefault: true },
  { name: "Contratos PJ", type: "INCOME", nature: "FIXED", context: "BUSINESS", group: "Renda", isDefault: true },
  { name: "Projetos PJ", type: "INCOME", nature: "VARIABLE", context: "BUSINESS", group: "Renda", isDefault: true },

  // Despesas Pessoais Fixas
  { name: "Aluguel", type: "EXPENSE", nature: "FIXED", context: "PERSONAL", group: "Habitação", isDefault: true },
  { name: "Condomínio", type: "EXPENSE", nature: "FIXED", context: "PERSONAL", group: "Habitação", isDefault: true },
  { name: "Internet", type: "EXPENSE", nature: "FIXED", context: "PERSONAL", group: "Habitação", isDefault: true },
  { name: "Plano de Saúde", type: "EXPENSE", nature: "FIXED", context: "PERSONAL", group: "Saúde", isDefault: true },
  { name: "Escola / Faculdade", type: "EXPENSE", nature: "FIXED", context: "PERSONAL", group: "Educação", isDefault: true },
  { name: "Streaming", type: "EXPENSE", nature: "FIXED", context: "PERSONAL", group: "Lazer", isDefault: true },

  // Despesas Pessoais Variáveis
  { name: "Mercado", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Alimentação", isDefault: true },
  { name: "Restaurante", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Alimentação", isDefault: true },
  { name: "Delivery", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Alimentação", isDefault: true },
  { name: "Combustível", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Transporte", isDefault: true },
  { name: "Transporte Público", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Transporte", isDefault: true },
  { name: "Uber / 99", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Transporte", isDefault: true },
  { name: "Farmácia", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Saúde", isDefault: true },
  { name: "Consulta Médica", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Saúde", isDefault: true },
  { name: "Cursos", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Educação", isDefault: true },
  { name: "Cinema / Shows", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Lazer", isDefault: true },
  { name: "Viagens", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Lazer", isDefault: true },
  { name: "Roupas", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Vestuário", isDefault: true },
  { name: "IRPF", type: "EXPENSE", nature: "VARIABLE", context: "PERSONAL", group: "Impostos", isDefault: true },

  // Despesas PJ
  { name: "DAS MEI", type: "EXPENSE", nature: "FIXED", context: "BUSINESS", group: "Impostos", isDefault: true },
  { name: "IRPJ", type: "EXPENSE", nature: "VARIABLE", context: "BUSINESS", group: "Impostos", isDefault: true },
  { name: "Contador", type: "EXPENSE", nature: "FIXED", context: "BUSINESS", group: "Serviços", isDefault: true },
  { name: "Software / Ferramentas", type: "EXPENSE", nature: "FIXED", context: "BUSINESS", group: "Serviços", isDefault: true },
  { name: "Fornecedores", type: "EXPENSE", nature: "VARIABLE", context: "BUSINESS", group: "Serviços", isDefault: true }
];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contextFilter = searchParams.get('context');

    const count = await prisma.category.count({
      where: { userId: session.user.id }
    });

    if (count === 0) {
      const categoriesToCreate = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        userId: session.user.id
      }));

      await prisma.category.createMany({
        data: categoriesToCreate
      });
    }

    const whereClause: any = (contextFilter === 'PF' || contextFilter === 'PJ') 
      ? { OR: [{ isDefault: true }, { context: contextFilter, userId: session.user.id }] }
      : { OR: [{ isDefault: true }, { userId: session.user.id }] };

    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: [
        { type: 'asc' },
        { context: 'asc' },
        { nature: 'asc' },
        { group: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("ERRO GET CATEGORIES:", error);
    return NextResponse.json({ error: error.message || "Erro Interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não Autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CategorySchema.parse(body);

    const newCategory = await prisma.category.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        isDefault: false
      }
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST CATEGORY:", error);
    return NextResponse.json({ error: error.message || "Erro Interno" }, { status: 500 });
  }
}
