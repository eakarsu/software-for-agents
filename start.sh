#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "$0")"
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-${PORT:-3013}}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export BACKEND_PORT FRONTEND_PORT

for name in DATABASE_URL JWT_SECRET CORS_ORIGINS PROVISION_ADMIN_EMAIL PROVISION_ADMIN_PASSWORD OPENROUTER_API_KEY OPENROUTER_MODEL OPENROUTER_BASE_URL; do
  [[ -n "${!name:-}" ]] || { echo "$name is required." >&2; exit 1; }
done
[[ "$OPENROUTER_BASE_URL" == "https://openrouter.ai/api/v1" ]] || { echo "OPENROUTER_BASE_URL must use the canonical OpenRouter API base." >&2; exit 1; }
[[ ${#JWT_SECRET} -ge 32 ]] || { echo "JWT_SECRET must contain at least 32 characters." >&2; exit 1; }
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo "Backend and frontend ports must differ." >&2; exit 1; }

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use; refusing to terminate an unrelated process."
    exit 1
  fi
done

if [[ ! -d backend/node_modules || ! -d frontend/node_modules ]]; then
  echo "Dependencies are not installed. Run npm ci in backend/ and frontend/."
  exit 1
fi

npm --prefix backend run migrate
BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin npm --prefix backend run create-admin
PORT="$BACKEND_PORT" npm --prefix backend start &
backend_pid=$!
BACKEND_PORT="$BACKEND_PORT" npm --prefix frontend run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in {1..100}; do
  curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/health/ready" >/dev/null 2>&1 && break
  sleep 0.2
done
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/health/ready" >/dev/null
curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null
echo "AgentHub running: UI http://127.0.0.1:${FRONTEND_PORT}, API http://127.0.0.1:${BACKEND_PORT}"
wait "$backend_pid" "$frontend_pid"
