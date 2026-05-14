#!/bin/bash

BACKEND_PORT=3013; FRONTEND_PORT=5173; DB_NAME="agent_services_db"
echo "Starting AgentHub..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
sleep 1
set -a; [ -f .env ] && source .env; set +a
createdb $DB_NAME 2>/dev/null || true
psql -d $DB_NAME -f backend/db/schema.sql -q
psql -d $DB_NAME -f backend/db/seed.sql -q
(cd backend && npm install --silent)
(cd frontend && npm install --silent)
(cd backend && npx nodemon server.js) &
sleep 2; (cd frontend && npm run dev) &
echo "http://localhost:$FRONTEND_PORT | admin@demo.com / demo123"
trap 'kill $(jobs -p) 2>/dev/null' EXIT; wait
