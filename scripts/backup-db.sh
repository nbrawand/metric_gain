#!/usr/bin/env bash
#
# Backup the Metric Gain PostgreSQL database.
#
# Usage:
#   ./scripts/backup-db.sh              # backup to backups/ with timestamp
#   ./scripts/backup-db.sh my_backup    # backup to backups/my_backup.sql
#
# Restore:
#   docker-compose exec -T postgres psql -U metricgain -d metricgain_dev < backups/<file>.sql

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Build filename
if [ -n "${1:-}" ]; then
  FILENAME="${1}.sql"
else
  FILENAME="metricgain_$(date +%Y%m%d_%H%M%S).sql"
fi

BACKUP_PATH="$BACKUP_DIR/$FILENAME"

echo "Backing up database to $BACKUP_PATH ..."

docker-compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U metricgain -d metricgain_dev --clean --if-exists \
  > "$BACKUP_PATH"

SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo "Backup complete: $BACKUP_PATH ($SIZE)"
