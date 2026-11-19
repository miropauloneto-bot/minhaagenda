#!/usr/bin/env bash
# Atualiza o site na VPS com a versão mais recente do GitHub. Uso: ./deploy/atualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose -f deploy/docker-compose.yml up -d
echo "Site atualizado."
