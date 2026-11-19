#!/usr/bin/env bash
# Atualiza o site na VPS com a versão mais recente do GitHub. Uso: ./atualizar.sh
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
docker compose up -d
echo "Site atualizado."
