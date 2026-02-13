# Metric Gain - Workout Progressive Web App

A progressive web app for optimizing strength training through scientifically-backed progressive overload and auto-regulation.

## Features

- **Mesocycle Management**: Create 3-7 week training blocks
- **Progressive Overload**: Automatic weight and volume progression
- **Auto-Regulation**: Adjust training based on recovery feedback
- **Offline Support**: Log workouts without internet connection
- **Exercise Library**: 50+ pre-loaded exercises + custom exercises
- **Templates**: Pre-built workout programs

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Deployment**: Vercel (frontend) + Railway (backend)

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

This wipes all data (users, mesocycles, workouts), re-runs migrations, and re-seeds stock data (49 exercises + Push Pull Legs template). The backend seeds automatically on startup.

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

# 4. Restart backend (seeds exercises + stock mesocycles on startup)
uvicorn app.main:app --reload
```

After restart, register a new account at `http://localhost:5173`.

**What gets seeded on startup** (see `backend/app/main.py`):
- `seed_exercises()` — 49 default exercises across all muscle groups
- `seed_mesocycles()` — Push Pull Legs 6-day template (stock, available to all users)

Seed scripts are in `backend/app/utils/seed_exercises.py` and `backend/app/utils/seed_mesocycles.py`. They only run if no stock data exists yet.

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
