#!/bin/bash
set -e

APP_DIR="/var/www/soluteg-financas"
APP_NAME="soluteg-financas"

cd "$APP_DIR"

echo "==> [1/6] git pull"
git pull

echo "==> [2/6] npm install"
npm install

echo "==> [3/6] prisma generate"
npx prisma generate

echo "==> [4/6] next build"
npm run build

echo "==> [5/6] pm2 restart"
pm2 restart "$APP_NAME"

echo "==> [6/6] verificando status"
sleep 4
STATUS=$(pm2 jlist | node -e "const apps=JSON.parse(require('fs').readFileSync(0,'utf8'));const app=apps.find(a=>a.name==='$APP_NAME');console.log(app?app.pm2_env.status:'not_found')")

if [ "$STATUS" != "online" ]; then
  echo ""
  echo "ERRO: app está '$STATUS', não 'online'. Verifique os logs:"
  echo "  pm2 logs $APP_NAME --lines 30 --nostream"
  exit 1
fi

echo ""
echo "✓ Deploy concluído com sucesso. App online."
