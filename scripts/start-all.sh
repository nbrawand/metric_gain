#!/usr/bin/env bash
#
# Start all Strength Guider services (database, backend, frontend).
#
# Usage:
#   ./scripts/start-all.sh         # start all services
#   ./scripts/start-all.sh stop    # stop all services
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

stop_services() {
  echo "Stopping services..."

  # Stop backend
  if [ -f "$PROJECT_DIR/.backend.pid" ]; then
    kill "$(cat "$PROJECT_DIR/.backend.pid")" 2>/dev/null || true
    rm -f "$PROJECT_DIR/.backend.pid"
    echo "  Backend stopped"
  fi

  # Stop frontend
  if [ -f "$PROJECT_DIR/.frontend.pid" ]; then
    kill "$(cat "$PROJECT_DIR/.frontend.pid")" 2>/dev/null || true
    rm -f "$PROJECT_DIR/.frontend.pid"
    echo "  Frontend stopped"
  fi

  # Stop database
  docker-compose -f "$PROJECT_DIR/docker-compose.yml" down 2>/dev/null || true
  echo "  Database stopped"

  echo "All services stopped."
}

if [ "${1:-}" = "stop" ]; then
  stop_services
  exit 0
fi

# Stop any existing services first
stop_services 2>/dev/null || true

echo "Starting Strength Guider services..."

# 1. Start PostgreSQL
echo "  Starting database..."
docker-compose -f "$PROJECT_DIR/docker-compose.yml" up -d 2>&1 | grep -v "level=warning" || true

# Wait for postgres to be ready
echo "  Waiting for database to be ready..."
for i in $(seq 1 30); do
  if docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres pg_isready -U metricgain -q 2>/dev/null; then
    break
  fi
  sleep 1
done

# 2. Start Backend
echo "  Starting backend..."
cd "$BACKEND_DIR"
.venv/bin/uvicorn app.main:app --reload --port 8000 > "$PROJECT_DIR/.backend.log" 2>&1 &
echo $! > "$PROJECT_DIR/.backend.pid"

# Wait for backend to be ready
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 3. Start Frontend
echo "  Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev > "$PROJECT_DIR/.frontend.log" 2>&1 &
echo $! > "$PROJECT_DIR/.frontend.pid"

# Wait for frontend to be ready
sleep 2

echo ""
echo "All services running:"
echo "  Database:  postgresql://localhost:5432/metricgain_dev"
echo "  Backend:   http://localhost:8000"
echo "  Frontend:  http://localhost:5173"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  Backend:   $PROJECT_DIR/.backend.log"
echo "  Frontend:  $PROJECT_DIR/.frontend.log"
echo ""
echo "Stop all:    $0 stop"
