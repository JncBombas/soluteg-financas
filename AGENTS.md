# Soluteg Finanças - Guia de Arquitetura para Agentes de IA

## 1. Identidade do Projeto
- **Nome:** Soluteg Finanças
- **Empresa:** Soluteg (soluteg.com.br)
- **URL de Produção:** fin.soluteg.com.br
- **Propósito:** App de gestão financeira pessoal com autenticação Google OAuth.

## 2. Stack e Versões (CRÍTICO)
- **Next.js 15+ com App Router** — NÃO usar Pages Router em hipótese alguma.
- **NextAuth v5 beta** — A API mudou drasticamente. Usar `auth()` no server-side, NUNCA usar `getServerSession()`.
- **Prisma 7 com adapter para MariaDB** — Não usar prisma client padrão direto, obrigatório uso do adapter (`@prisma/adapter-mariadb`).
- **React 19**
- *Nota Crítica:* Leia a documentação oficial da Vercel ou consulte referências atualizadas antes de qualquer implementação complexa para evitar APIs descontinuadas.

## 3. Arquitetura
- **Layouts Protegidos:** Todas as páginas protegidas usam o `DashboardLayout` localizado em `src/components/layout/`.
- **Autenticação:** Autenticação verificada rigorosamente no server-side nas rotas de API utilizando `auth()` exportado de `src/auth.ts`.
- **Validação:** Validação de input com **Zod** centralizada em `src/lib/validations.ts`.
- **Banco de Dados:** Client Prisma instanciado como singleton em `src/lib/db.ts`.
- **Tema Visual:** Dark glassmorphism com accent verde neon (`#00ff88`).

## 4. Convenções de Código
- **Páginas:** Componentes de página devem ficar em `src/app/[rota]/page.tsx`.
- **Componentes:** Componentes reutilizáveis devem ficar em `src/components/`.
- **APIs:** API routes devem seguir a estrutura `src/app/api/[recurso]/route.ts`.
- **CSS:** Estilos globais ficam em `src/app/globals.css` — NÃO criar arquivos CSS separados/módulos sem extrema necessidade para evitar fragmentação de código.
- **Idioma:** Mensagens de erro, logs visíveis e textos de UI devem ser estritamente em português (Brasil).

## 5. Banco de Dados
- **Motor:** MariaDB conectado via Prisma com adapter dedicado (`@prisma/adapter-mariadb`).
- **Segurança:** Credenciais carregadas via variáveis de ambiente granulares (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT`). Nunca usar a string fixa na aplicação.
- **Migrations:** Para aplicar mudanças: `npx prisma migrate dev`.
- **Schema:** Para inspecionar estrutura, leia `prisma/schema.prisma`.

## 6. O Que NÃO Fazer
- ❌ **Não usar** `getServerSession()` — Completamente deprecated no NextAuth v5. Use `auth()`.
- ❌ **Não criar** novas tabelas sem atualizar `prisma/schema.prisma` e rodar a respectiva migration.
- ❌ **Não expor** credenciais de banco em logs do servidor, respostas de API ou comentários no código.
- ❌ **Não usar** Pages Router (`/pages/`) — O projeto usa exclusivamente App Router (`src/app/`).
- ❌ **Não hardcodar** strings em inglês na UI — O aplicativo é 100% em português.

## 7. Regras de Segurança
- Toda rota de API que lê ou escreve dados deve verificar se a sessão existe antes de qualquer operação no banco.
- Toda query SQL/Prisma que busca dados do usuário deve incluir o filtro por `userId` da sessão autenticada. Nunca retornar a base toda ou dados alheios.
- O Input do usuário deve ser sempre validado com schemas do **Zod** antes de ser gravado ou processado.
