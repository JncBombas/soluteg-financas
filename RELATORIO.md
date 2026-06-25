# Relatório de Alterações — Soluteg Finanças

Documento consolidado das mudanças realizadas e das pendências em aberto.
Última atualização: **2026-06-24**.

---

## 1. Correções de Segurança (commit `145bb79`)

| # | Problema | Correção |
|---|----------|----------|
| S1 | **IDOR** em `POST /api/transactions`: validava posse só da categoria, não de `creditCardId`/`bankAccountId` — permitia vincular transação a conta/cartão de outro usuário. | Validação de posse (por `userId`) de categoria, conta e cartão antes de criar. |
| S2 | **IDOR** no `PUT /api/transactions/[id]`: aceitava IDs de conta/cartão/categoria alheios no update. | Mesma validação de posse aplicada no update. |
| S3 | **Vazamento cross-user** em `GET /api/categories`: o filtro `OR: [{ isDefault: true }, ...]` retornava categorias padrão de **todos** os usuários. | `whereClause` sempre escopado por `userId`. |

> Referência da regra violada: AGENTS.md §7 (toda query de dados do usuário deve filtrar por `userId`).

---

## 2. Correções Técnicas — Auditoria (commit `145bb79`)

Backlog priorizado da auditoria de 2026-06-23.

### Alta
- **P1 — Atomicidade de parcelas/recorrências.** O `POST /api/transactions` criava as parcelas/ocorrências em loop sem transação; falha no meio deixava `TransactionGroup` órfão. Reescrito com `prisma.$transaction` interativo + `createMany`.

### Média
- **P2 — Timezone (UTC vs UTC-3).** Datas gravadas à meia-noite UTC apareciam um dia antes no Brasil. Criado helper `parseInputDate` (meio-dia UTC) e exportado `toLocalISOString` em `src/lib/businessDays.ts`; aplicados no POST/PUT de transações e nas datas do dashboard. `calcularDueDate` passou a usar `Date.UTC(...,12)`.
- **P3 — Saldo do dashboard.** Passou a considerar apenas transações `PAID` (coerente com o saldo das contas). Pendentes aparecem em "Próximos Vencimentos".

### Baixa
- **P4 — N+1 de queries.** `GET /api/bank-accounts` usa um único `groupBy`; `GET /api/credit-cards` usa um `findMany` + soma por ciclo em JS.
- **P5 — `datasource` sem `url`.** Falso positivo: `prisma.config.ts` já fornece a URL via `DATABASE_URL` (forma correta no Prisma 7). `prisma validate` OK.
- **P7 — Limpeza.** Removido branch morto de filtro de contexto em `GET /api/categories` (comparava `PF`/`PJ` com `PERSONAL`/`BUSINESS`, nunca acionado).

---

## 3. Migração `Float` → `Decimal(10,2)` (P6, commit `145bb79`)

Valores monetários eram `Float` (risco de arredondamento). Migrados para `Decimal(10,2)`.

- **Schema:** `Transaction.amount`, `Transaction.fee`, `TransactionGroup.totalAmount`, `BankAccount.initialBalance`, `CreditCard.limit`.
- **Estratégia:** storage exato no banco + conversão para `number` na borda das APIs via `src/lib/serialize.ts` (`serializeDecimals`) — o contrato JSON (number) **não mudou**, então o frontend não foi alterado.
- **Aritmética server-side:** ajustada com `Number(...)`; fatura do cartão somada em centavos inteiros.
- **Parcelas/seed:** divisão em centavos com a sobra na última parcela (evita soma ≠ total).

---

## 4. Feature — Despesas Fixas + Alertas Web Push (commit `830a60e`)

Antes, "recorrência" materializava todas as ocorrências de uma vez, poluindo o histórico e sem avisos. Novo modelo:

- **Cadastro** de despesa fixa (`RecurringExpense`) em página própria (`/fixed-expenses`), separado do histórico. Suporta valor **fixo ou variável** por despesa.
- **Materialização sob demanda:** a rotina diária cria **um** lançamento `PENDING` "Previsto" quando o vencimento entra na janela de ~30 dias (dedupe por `recurringExpenseId` + `periodKey`). No vencimento vira "A vencer"/"Vencido".
- **Alertas Web Push (PWA, app fechado):** 3 dias antes e no dia. Vale também para **lançamentos avulsos futuros**.
- **Estado "Previsto"** é derivado por data (sem novo enum). Despesas variáveis ganham badge "Revisar valor".

### Arquivos principais
- Schema: `RecurringExpense`, `PushSubscription`; campos novos em `Transaction` (`recurringExpenseId`, `isEstimated`, `alertBeforeSentAt`, `alertDueSentAt`, `periodKey`).
- APIs: `recurring-expenses` (CRUD), `notifications`, `push/subscribe`, `cron/daily` (protegida por `CRON_SECRET`).
- Web Push: `src/lib/push.ts` (web-push), `worker/index.ts` (service worker compilado pelo next-pwa), `src/lib/usePushNotifications.ts`, sino funcional na `Topbar`.
- UI: página `/fixed-expenses`, `RecurringExpenseModal`, item na sidebar, badges em transações e dashboard.
- Doc de deploy: `docs/despesas-fixas-deploy.md`.

### Decisões de escopo (v1)
- Despesa fixa em **cartão de crédito** usa o `dueDay` da própria despesa, **não** o ciclo da fatura.
- Materialização e envio de alertas rodam no **mesmo** job (`/api/cron/daily`).
- Recorrências do modelo **antigo** foram mantidas intactas.

---

## 5. ⛔ Pendências de Deploy (necessárias para produção)

Sem estes passos, as telas novas falham (o código espera as colunas novas) e os alertas não disparam. Detalhes em `docs/despesas-fixas-deploy.md`.

- [ ] **Aplicar o schema no banco:** `npx prisma db push` (aplica os modelos novos **e** a migração `Decimal` do P6). SQL manual alternativo do P6 em `prisma/migrations-manual/decimal_money.sql`.
- [ ] **Gerar chaves VAPID** (`npx web-push generate-vapid-keys --json`) e setar no `.env` do servidor: `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (mesma pública), `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
- [ ] **Agendar o crontab diário** chamando `/api/cron/daily` com `Authorization: Bearer $CRON_SECRET`.
- [ ] **Build/restart** do app. Push exige HTTPS; no **iOS** exige o app instalado na tela inicial.

---

## 6. ⚠️ Pendências Técnicas / Melhorias futuras

- [ ] **Dados antigos (timezone).** O fix do P2 corrige transações **novas**. Registros gravados antes (à meia-noite UTC) ainda exibem um dia a menos — exigiria migração de dados para corrigir o histórico.
- [ ] **Limite do `Decimal(10,2)`** = `99.999.999,99` por valor. Suficiente para finanças pessoais; se houver valores PJ maiores, mudar para `Decimal(14,2)`.
- [ ] **Cartão de crédito em despesa fixa** ignora o ciclo de fatura (usa `dueDay`). Refinar se necessário.
- [ ] **Semântica `PF`/`PJ` vs `PERSONAL`/`BUSINESS`** em categorias: o `context` de categorias usa `PERSONAL`/`BUSINESS`, divergente do resto do app (`PF`/`PJ`). O filtro por contexto de categorias não funciona se reintroduzido — padronizar os valores.
- [ ] **Lint baseline:** ~72 erros pré-existentes (regras React Compiler, uso de `any`, `<img>`), não relacionados às mudanças desta sessão.
- [ ] **`npm audit`:** 13 vulnerabilidades (2 altas) em dependências transitivas. Revisar antes de `npm audit fix --force` (pode quebrar versões).
- [ ] **CRLF/LF:** o repositório recebe avisos de fim de linha no Windows. Um `.gitattributes` normalizaria (`* text=auto eol=lf`).

---

## 7. Validação realizada

A cada etapa: `npx tsc --noEmit` (limpo) e `npx prisma validate` (OK). A feature de Despesas Fixas passou também por `npm run build` completo (o service worker custom compilou e todas as rotas novas foram geradas).

---

## 8. Histórico de commits

| Commit | Descrição |
|--------|-----------|
| `145bb79` | Correções de segurança + auditoria (S1–S3, P1–P7, migração Decimal) |
| `830a60e` | Feature Despesas Fixas + lançamentos previstos + alertas Web Push |
