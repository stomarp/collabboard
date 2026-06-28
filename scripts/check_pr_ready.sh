#!/usr/bin/env bash
set -euo pipefail

echo "==> Cleaning text files"
python3 scripts/clean_text_files.py

echo "==> Checking whitespace"
git diff --check

echo "==> Building and starting services"
docker compose down
docker compose up -d --build

echo "==> Waiting for backend"
for i in {1..30}; do
  if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
    echo "Backend is healthy."
    break
  fi

  if [ "$i" -eq 30 ]; then
    echo "Backend did not become healthy in time."
    docker compose logs backend --tail=120
    exit 1
  fi

  sleep 2
done

echo "==> Applying migrations"
docker compose exec backend alembic upgrade head

echo "==> Health response"
curl -fsS http://localhost:8000/health
echo

echo "==> PR readiness checks passed."