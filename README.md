# Strength Guider - Workout Progressive Web App

A progressive web app for running structured strength training blocks that you plan yourself.

## Features

- **Mesocycle Management**: Create 3-12 week training blocks
- **Progressive Overload**: Automatic weight and volume progression
- **Volume Planning**: Pick a starting set count and a 0-2 sets/week ramp per exercise, then review weekly sets per muscle group before committing
- **Offline Support**: Log workouts without internet connection
- **Exercise Library**: 115 pre-loaded exercises + custom exercises
- **Templates**: 10 stock mesocycle templates

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Deployment**: Vercel (frontend) + Render (backend)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for local database)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start database
cd ..
docker-compose up -d

# Run migrations
cd backend
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Running Tests

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm run test
```

### Full Database Reset

This wipes all data (users, mesocycles, workouts), re-runs migrations, and re-seeds stock data. Seeding is a separate command, not part of startup.

```bash
# 1. Stop the backend (if running)
kill $(lsof -ti:8000) 2>/dev/null

# 2. Drop all tables and recreate schema
docker-compose exec -T postgres psql -U metricgain -d metricgain_dev -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO metricgain;"

# 3. Re-run all migrations
cd backend
source venv/bin/activate
alembic upgrade head

# 4. Re-seed stock exercises and templates
python pre_deploy.py

# 5. Restart backend
uvicorn app.main:app --reload
```

After restart, sign in with Google at `http://localhost:5173`.

**What gets seeded** (see `backend/pre_deploy.py`):
- `seed_exercises()` — 115 default exercises across all muscle groups
- `seed_mesocycles()` — 10 stock templates (Push Pull Legs, 2/3-Day Full Body, 4-Day Upper Lower, 5-Day L/P/P/L/U, Beginner Strength, Beginner Machine Only, Beginner 3-Day Upper/Lower, Bro Split, Glute & Lower Body Focus)

Seed scripts are in `backend/app/utils/seed_exercises.py` and `backend/app/utils/seed_mesocycles.py`. They only run if no stock data exists yet.

### Database Backup & Restore

**Backup:**
```bash
# Backup with auto-generated timestamp filename
./scripts/backup-db.sh

# Backup with a custom name
./scripts/backup-db.sh before_migration
```

Backups are saved to `backups/` (gitignored). Each file is a full SQL dump including `DROP` statements for clean restores.

**Restore:**
```bash
docker-compose exec -T postgres psql -U metricgain -d metricgain_dev < backups/<filename>.sql
```

## Project Structure

```
metric_gain/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helper functions
│   ├── tests/            # Backend tests
│   └── alembic/          # Database migrations
├── frontend/             # React frontend
│   └── src/
│       ├── api/          # API client functions
│       ├── components/   # React components
│       ├── pages/        # Page components
│       ├── hooks/        # Custom hooks
│       ├── stores/       # State management
│       └── types/        # TypeScript types
└── reference_pictures/   # Design references

```

## Documentation

- [Requirements](reference_pictures/requirements.md)
- [Technical Architecture](reference_pictures/technical-architecture.md)
- [Database Schema](reference_pictures/database-schema.md)
- [API Specification](reference_pictures/api-specification.md)
- [Implementation Plan](reference_pictures/ai-implementation-plan.md)

## Development Workflow

1. Create feature branch from `develop`
2. Implement feature with tests
3. Run tests locally
4. Create pull request
5. Merge to `develop`
6. Deploy to staging
7. Merge to `main` for production

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://metricgain:password@localhost:5432/metricgain_dev
SECRET_KEY=your-secret-key-change-in-production
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## License

MIT

## Contributors

Built with Claude Code
