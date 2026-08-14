#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Bitte als root ausführen: sudo ./install.sh"; exit 1; fi
APP_DIR=/opt/maplens
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
apt-get update
apt-get install -y nginx build-essential python3 openssl curl ca-certificates
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
if [[ ! "$node_major" =~ ^[0-9]+$ ]] || (( node_major < 22 )); then
  echo "Installiere Node.js 22 …"
  node_setup="$(mktemp)"
  curl -fsSL https://deb.nodesource.com/setup_22.x -o "$node_setup"
  bash "$node_setup"
  rm -f "$node_setup"
  apt-get install -y nodejs
elif ! command -v npm >/dev/null 2>&1; then
  apt-get install -y npm
fi
id maplens >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin maplens
mkdir -p "$APP_DIR" "$APP_DIR/data/images"
cp -a "$SOURCE_DIR/package.json" "$SOURCE_DIR/package-lock.json" "$SOURCE_DIR/server.js" "$SOURCE_DIR/CHANGELOG.json" "$SOURCE_DIR/src" "$SOURCE_DIR/public" "$SOURCE_DIR/scripts" "$SOURCE_DIR/deploy" "$APP_DIR/"
cd "$APP_DIR"
npm ci --omit=dev
chown -R root:root "$APP_DIR"
chown -R maplens:maplens "$APP_DIR/data"
if [[ ! -f /etc/maplens.env ]]; then printf 'PORT=8000\nNODE_ENV=production\nTRUST_PROXY=1\nSESSION_SECRET=%s\nDB_PATH=/opt/maplens/data/maplens.sqlite\nIMAGE_DIR=/opt/maplens/data/images\nUPDATE_REPO=BenAhrdt/maplens\n' "$(openssl rand -hex 32)" > /etc/maplens.env; chmod 600 /etc/maplens.env; fi
grep -q '^TRUST_PROXY=' /etc/maplens.env || printf '\nTRUST_PROXY=1\n' >> /etc/maplens.env
city_count="$(runuser -u maplens -- env DB_PATH=/opt/maplens/data/maplens.sqlite node -e "const {openDatabase}=require('/opt/maplens/src/db');const db=openDatabase();console.log(db.prepare('SELECT COUNT(*) count FROM cities').get().count);db.close()")"
if (( city_count < 10000 )); then
  echo "Importiere vollständige GeoNames-Ortsdaten …"
  runuser -u maplens -- env DB_PATH=/opt/maplens/data/maplens.sqlite npm run setup:geodata
fi
cp deploy/maplens.service /etc/systemd/system/maplens.service
cp deploy/maplens-update.service /etc/systemd/system/maplens-update.service
cp deploy/maplens-update.path /etc/systemd/system/maplens-update.path
cp deploy/nginx.conf /etc/nginx/sites-available/maplens
ln -sf /etc/nginx/sites-available/maplens /etc/nginx/sites-enabled/maplens
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload
systemctl enable maplens nginx maplens-update.path
systemctl restart maplens nginx maplens-update.path
echo "MapLens ist unter http://$(hostname -I | awk '{print $1}')/ erreichbar. Ersten Admin dort über 'Admin' anlegen."
