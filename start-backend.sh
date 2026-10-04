#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker info >/dev/null
docker compose up -d --no-deps pasitos-backend
printf '%s\n' 'Backend: http://localhost:3001. Mantén Docker y PostgreSQL activos.'
