#!/bin/bash
set -eu

BACKEND_PORT="${PORT:-3013}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use; refusing to terminate an unrelated process."
    exit 1
  fi
done

if [ ! -d backend/node_modules ] || [ ! -d frontend/node_modules ]; then
  echo "Dependencies are not installed. Run npm ci in backend/ and frontend/."
  exit 1
fi

echo "Database migrations and the tool worker are separate operational steps."
(cd backend && npm start) &
backend_pid=$!
(cd frontend && npm run dev -- --port "$FRONTEND_PORT") &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
wait
