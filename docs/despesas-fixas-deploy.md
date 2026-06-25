# Despesas Fixas + Alertas Push — Passos de Deploy

Feature: cadastro de despesas fixas, materialização automática de lançamentos
próximos do vencimento e alertas via Web Push (3 dias antes e no dia).

## 1. Banco de dados
Aplicar o novo schema (modelos `RecurringExpense`, `PushSubscription` e novos
campos em `Transaction`). Junto vai a migração Decimal pendente do P6:

```bash
npx prisma generate
npx prisma db push
```

## 2. Variáveis de ambiente (`.env` do servidor)
Gerar as chaves VAPID (uma vez) e definir o segredo do cron:

```bash
npx web-push generate-vapid-keys --json
```

```env
VAPID_PUBLIC_KEY="<publicKey gerada>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<mesma publicKey>"
VAPID_PRIVATE_KEY="<privateKey gerada>"
VAPID_SUBJECT="mailto:contato@soluteg.com.br"
CRON_SECRET="<segredo aleatório forte>"
```

> A chave pública precisa estar nas DUAS variáveis (a `NEXT_PUBLIC_` é lida no
> navegador para criar a inscrição; a outra é usada no servidor para enviar).
> A privada NUNCA vai para o cliente.

Após alterar env, refazer o build/restart (`npm run build && npm start` ou pm2 restart).

## 3. Agendamento diário (crontab)
A rotina `/api/cron/daily` materializa os lançamentos e envia os alertas.
Agende-a uma vez por dia (ex.: 06:05 da manhã). Editar com `crontab -e`:

```cron
5 6 * * * curl -s -H "Authorization: Bearer SEU_CRON_SECRET" https://fin.soluteg.com.br/api/cron/daily > /dev/null 2>&1
```

Substitua `SEU_CRON_SECRET` pelo valor de `CRON_SECRET`. Alternativamente, pode
passar como query: `https://fin.soluteg.com.br/api/cron/daily?secret=SEU_CRON_SECRET`
(prefira o header).

## 4. Service worker (push)
O handler de push fica em `worker/index.ts` e é compilado automaticamente pelo
`@ducanh2912/next-pwa` no `next build` (gera `public/worker-*.js`, já ignorado no
git). Nada manual além do build. O usuário ativa as notificações no sino do app
(precisa do app em HTTPS e, no iOS, instalado na tela inicial).

## 5. Teste rápido
1. Cadastrar uma despesa fixa com vencimento nos próximos dias.
2. Disparar o cron manualmente:
   `curl -H "Authorization: Bearer SEU_CRON_SECRET" https://fin.soluteg.com.br/api/cron/daily`
   → deve retornar `{ ok: true, materializadas: N, alertasEnviados: M, ... }`.
3. Conferir o lançamento "Previsto" em Transações e o item no sino.
4. Ativar notificações no sino e repetir o cron com um vencimento em hoje/+3
   para receber o push (sem reenvio na segunda execução).
