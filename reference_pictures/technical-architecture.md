# Technical Architecture Document

## 1. System Overview

The Workout PWA is built as a modern full-stack application with a React frontend and FastAPI backend, designed for scalability, ML integration, and ease of development.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (PWA)                       │
│              React + TypeScript + Vite/Next.js              │
│                   Service Worker (Offline)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
┌──────────────────────┴──────────────────────────────────────┐
│                    API Gateway Layer                         │
│                   FastAPI (Python 3.11+)                     │
│              JWT Auth Middleware + CORS                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────┴────────┐         ┌─────────┴──────────┐
│  Business Logic │         │   ML Service       │
│    Services     │         │   (Future)         │
│  - Progressive  │         │  - Models          │
│    Overload     │         │  - Predictions     │
│  - Auto-reg     │         │  - Analytics       │
└───────┬────────┘         └─────────┬──────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Data Layer                                │
│               PostgreSQL Database                            │
│            (Hosted on Supabase/Railway)                      │
└─────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

### 2.1 Frontend

**Core Framework:**
- **React 18+** with **TypeScript**
- **Vite** for development and building (fast, modern)
- Alternative: **Next.js 14+** (if you want SSR/better SEO)

**State Management:**
- **TanStack Query (React Query)** - Server state management
- **Zustand** or **Context API** - Client state management

**PWA:**
- **Vite PWA Plugin** or **Workbox** - Service worker generation
- **Web App Manifest** - Installation support

**UI Framework:**
- **Tailwind CSS** - Utility-first styling (matches minimalist design)
- **Headless UI** or **Radix UI** - Accessible components
- **Framer Motion** - Smooth animations (optional)

**Form Handling:**
- **React Hook Form** - Performance-optimized forms
- **Zod** - Runtime type validation

### 2.2 Backend

**Core Framework:**
- **FastAPI 0.110+** (Python 3.11+)
- **Uvicorn** - ASGI server
- **Pydantic V2** - Data validation and serialization

**Database ORM:**
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migrations

**Authentication:**
- **Supabase Auth** (easiest option) OR
- **python-jose** + **passlib** - JWT tokens + password hashing

**ML Integration (Future):**
- **scikit-learn** - Traditional ML models
- **TensorFlow/PyTorch** - Deep learning
- **MLflow** - Model versioning and deployment

### 2.3 Database

**Primary Database:**
- **PostgreSQL 15+**
- Hosted on **Supabase** (includes auth) or **Railway**

**Why PostgreSQL:**
- Excellent relational data modeling
- JSON support for flexible data
- Complex query support for analytics
- ACID compliance
- Great Python support (psycopg2, asyncpg)

### 2.4 Infrastructure

**Frontend Hosting:**
- **Vercel** (recommended - zero config PWA support)
- Alternative: Netlify, Cloudflare Pages

**Backend Hosting:**
- **Railway** (easy Python deployment, free tier)
- Alternative: Render, Fly.io, Google Cloud Run

**Database Hosting:**
- **Supabase** (PostgreSQL + Auth + real-time)
- Alternative: Railway, Neon, AWS RDS

**CDN/Assets:**
- Vercel Edge Network (automatic)
- Cloudflare (if using other hosting)

## 3. Project Structure (Monorepo)

```
metric-gain/
├── README.md
├── .gitignore
├── docker-compose.yml          # Local development
├── .env.example
│
├── frontend/                    # React PWA
│   ├── public/
│   │   ├── manifest.json
│   │   ├── icons/
│   │   └── sw.js               # Service worker
│   ├── src/
│   │   ├── api/                # API client functions
│   │   ├── components/         # React components
│   │   │   ├── workout/
│   │   │   ├── mesocycle/
│   │   │   ├── exercise/
│   │   │   └── common/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── stores/             # Zustand stores
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Helper functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                     # FastAPI
│   ├── alembic/                # Database migrations
│   │   └── versions/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app entry
│   │   ├── config.py           # Settings/environment
│   │   ├── database.py         # DB connection
│   │   │
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── mesocycle.py
│   │   │   ├── workout.py
│   │   │   ├── exercise.py
│   │   │   └── set.py
│   │   │
│   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── mesocycle.py
│   │   │   ├── workout.py
│   │   │   └── exercise.py
│   │   │
│   │   ├── routers/            # API routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── mesocycles.py
│   │   │   ├── workouts.py
│   │   │   ├── exercises.py
│   │   │   └── templates.py
│   │   │
│   │   ├── services/           # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── progressive_overload.py
│   │   │   ├── auto_regulation.py
│   │   │   ├── mesocycle_manager.py
│   │   │   └── ml_service.py   # Future ML integration
│   │   │
│   │   ├── utils/              # Helper functions
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   └── calculations.py
│   │   │
│   │   └── middleware/         # Custom middleware
│   │       └── __init__.py
│   │
│   ├── tests/                  # Pytest tests
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── conftest.py
│   │
│   ├── requirements.txt        # Python dependencies
│   ├── pyproject.toml          # Poetry/project config
│   └── .env.example
│
├── ml/                          # ML models (future)
│   ├── notebooks/              # Jupyter notebooks
│   ├── models/                 # Trained models
│   ├── data/                   # Training data
│   └── scripts/                # Training scripts
│
└── docs/                        # Documentation
    ├── api/                    # API documentation
    ├── architecture/           # Architecture diagrams
    └── setup/                  # Setup guides
```

## 4. Core Services Architecture

### 4.1 Progressive Overload Service

**Location:** `backend/app/services/progressive_overload.py`

**Responsibilities:**
- Calculate next workout's weight recommendations
- Implement 2% weight increase algorithm
- Handle adaptive rep adjustments when user changes weight
- Support pluggable algorithms for future ML models

**Key Functions:**
```python
def calculate_next_weight(current_weight: float, progression_rate: float = 0.02) -> float
def adjust_reps_for_weight_change(original_weight: float, new_weight: float, original_reps: int) -> int
def calculate_rir_target(week_number: int, total_weeks: int) -> int
```

### 4.2 Auto-Regulation Service

**Location:** `backend/app/services/auto_regulation.py`

**Responsibilities:**
- Process soreness, pump, and challenge feedback
- Calculate set adjustments for next workout
- Enforce max 15 sets per exercise constraint
- Support ML model integration for personalized adjustments

**Key Functions:**
```python
def calculate_set_adjustment(soreness: int, pump: int, challenge: int) -> int
def apply_volume_adjustment(current_sets: int, adjustment: int, max_sets: int = 15) -> int
def get_feedback_recommendation(feedback_history: List[Feedback]) -> SetAdjustment
```

### 4.3 Mesocycle Manager Service

**Location:** `backend/app/services/mesocycle_manager.py`

**Responsibilities:**
- Handle mesocycle lifecycle (create, transition, deload)
- Copy workouts from previous mesocycle weeks
- Apply deload week modifications (50% weight, 50% sets)
- Manage mesocycle state transitions

**Key Functions:**
```python
def create_mesocycle(user_id: int, config: MesocycleConfig) -> Mesocycle
def start_new_from_week(old_mesocycle_id: int, week_number: int) -> Mesocycle
def apply_deload_week(mesocycle_id: int) -> None
def get_current_workout(mesocycle_id: int, week: int, day: int) -> Workout
```

## 5. Data Flow

### 5.1 Workout Recording Flow

```
1. User opens workout
   └─> GET /api/mesocycles/{id}/workouts/current
       └─> Returns workout with exercises and suggested weights/reps

2. Before muscle group
   └─> POST /api/workouts/{id}/feedback/soreness
       └─> Records soreness level (0-3)

3. User completes set
   └─> POST /api/workouts/{id}/exercises/{exercise_id}/sets
       └─> Records weight, reps, timestamp
       └─> Triggers: Calculate next set recommendation

4. After muscle group
   └─> POST /api/workouts/{id}/feedback/performance
       └─> Records pump (0-3) and challenge (0-3)
       └─> Triggers: Auto-regulation service calculates set adjustment

5. Complete workout
   └─> POST /api/workouts/{id}/complete
       └─> Updates mesocycle progress
       └─> Calculates next workout parameters
```

### 5.2 Progressive Overload Calculation Flow

```
Set Completed Event
    │
    ├─> Progressive Overload Service
    │   ├─> Get previous set performance
    │   ├─> Apply 2% weight increase (if applicable)
    │   ├─> Calculate RIR target for current week
    │   └─> Return recommendation
    │
    └─> Auto-Regulation Service
        ├─> Get muscle group feedback
        ├─> Calculate volume adjustment
        ├─> Apply constraints (max 15 sets)
        └─> Update next workout sets
```

## 6. Authentication & Authorization

### 6.1 Authentication Strategy

**Option A: Supabase Auth (Recommended for Easiest)**
- Use Supabase client libraries
- Built-in user management
- JWT tokens automatically handled
- Email/password, social login support

**Option B: Custom JWT Auth**
- FastAPI dependency injection
- JWT tokens (access + refresh)
- Password hashing with bcrypt/argon2

### 6.2 Authorization Flow

```
1. User login → JWT token issued
2. Client stores token (localStorage + httpOnly cookie for refresh)
3. All API requests include: Authorization: Bearer {token}
4. FastAPI middleware validates token
5. User context injected into route handlers
```

### 6.3 Security Measures

- HTTPS only in production
- CORS configuration (whitelist frontend domains)
- Rate limiting (prevent abuse)
- SQL injection prevention (SQLAlchemy ORM)
- XSS prevention (React escapes by default)
- CSRF tokens for state-changing operations

## 7. Offline Support (PWA)

### 7.1 Service Worker Strategy

**Cache First (Static Assets):**
- HTML, CSS, JS bundles
- Images, icons, fonts

**Network First (API Calls):**
- Workout data
- User profile
- Fall back to cache if offline

**Queue Strategy (Mutations):**
- POST/PUT/DELETE requests queued when offline
- Synced when connection restored
- Conflict resolution on sync

### 7.2 Offline Data Storage

**IndexedDB (via Dexie.js or localForage):**
- Cache mesocycles, workouts, exercises
- Store pending workout data
- Sync queue for mutations

### 7.3 Sync Strategy

```
1. User records set while offline
   └─> Stored in IndexedDB with sync_status: "pending"

2. Connection restored
   └─> Service worker detects online event
   └─> Sync queue processed
   └─> POST requests sent to API
   └─> Local cache updated with server response
   └─> sync_status: "synced"

3. Conflict resolution
   └─> Server timestamp wins
   └─> UI shows merge conflicts if needed
```

## 8. API Design Principles

### 8.1 RESTful Conventions

- **Resource-based URLs:** `/api/mesocycles`, `/api/workouts`
- **HTTP Methods:** GET (read), POST (create), PUT/PATCH (update), DELETE
- **Status Codes:** 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)
- **Pagination:** Query params `?page=1&limit=20`
- **Filtering:** Query params `?status=current&sort=-created_at`

### 8.2 Response Format

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Push Pull Legs"
  },
  "meta": {
    "timestamp": "2025-01-19T12:00:00Z",
    "version": "1.0"
  }
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid mesocycle duration",
    "details": {
      "field": "duration_weeks",
      "constraint": "Must be between 3 and 7"
    }
  }
}
```

### 8.3 Versioning

- URL versioning: `/api/v1/mesocycles`
- Header versioning (future): `Accept: application/vnd.metricgain.v2+json`

## 9. Performance Optimization

### 9.1 Backend

- **Database Connection Pooling:** SQLAlchemy pool
- **Query Optimization:** Eager loading, indexes
- **Caching:** Redis for frequently accessed data (future)
- **Async/Await:** FastAPI async handlers for I/O operations

### 9.2 Frontend

- **Code Splitting:** Dynamic imports, route-based splitting
- **Lazy Loading:** Components, images
- **Memoization:** React.memo, useMemo, useCallback
- **Virtualization:** react-window for long lists (future analytics)

### 9.3 Network

- **Compression:** gzip/brotli
- **HTTP/2:** Multiplexing
- **CDN:** Static assets via Vercel Edge
- **API Response Caching:** ETag headers

## 10. Development Workflow

### 10.1 Local Development

```bash
# Backend (Terminal 1)
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev

# Database (Docker)
docker-compose up -d postgres
```

### 10.2 Environment Variables

**Frontend (.env):**
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (.env):**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/metricgain
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

### 10.3 Testing Strategy

**Backend:**
- **pytest** for unit and integration tests
- **Test coverage:** aim for 80%+ on business logic
- **Fixtures:** Mock database, test users

**Frontend:**
- **Vitest** for unit tests
- **React Testing Library** for component tests
- **Playwright** or **Cypress** for E2E tests (future)

## 11. Deployment

### 11.1 Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Or connect GitHub repo for automatic deployments
```

**Configuration:**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables set in Vercel dashboard

### 11.2 Backend (Railway)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Or connect GitHub repo for automatic deployments
```

**Configuration:**
- Python version: 3.11+
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables set in Railway dashboard

### 11.3 Database (Supabase)

1. Create Supabase project at supabase.com
2. Get connection string from dashboard
3. Run migrations: `alembic upgrade head`
4. Seed exercise database

### 11.4 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd frontend
          npm install
          npm run test

  deploy:
    needs: [test-backend, test-frontend]
    # Vercel and Railway deploy automatically on push
```

## 12. Monitoring & Logging

### 12.1 Backend Logging

- **Loguru** or **structlog** for structured logging
- Log levels: DEBUG, INFO, WARNING, ERROR
- Request/response logging middleware

### 12.2 Error Tracking (Future)

- **Sentry** for error monitoring
- Frontend and backend integration
- User context, breadcrumbs

### 12.3 Analytics (Future)

- **Plausible** or **PostHog** - Privacy-friendly analytics
- Track user engagement, feature usage
- No personal data tracking

## 13. Scalability Considerations

### 13.1 Current Architecture (0-10k users)

- Single backend instance (Railway)
- Managed PostgreSQL (Supabase)
- CDN for static assets (Vercel)

### 13.2 Future Scaling (10k-100k users)

- **Horizontal scaling:** Multiple FastAPI instances + load balancer
- **Database:** Read replicas, connection pooling
- **Caching:** Redis for sessions, frequently accessed data
- **Background jobs:** Celery for async tasks (ML model training)

### 13.3 ML Service Scaling

- Separate microservice for ML predictions
- GPU instances for model inference (if needed)
- Model caching and batch predictions
- A/B testing framework for algorithm improvements

## 14. ML Integration Architecture (Future)

### 14.1 Model Development Pipeline

```
Data Collection (PostgreSQL)
    ↓
Data Preprocessing (Python scripts)
    ↓
Feature Engineering (pandas, numpy)
    ↓
Model Training (scikit-learn, TensorFlow)
    ↓
Model Evaluation (cross-validation, metrics)
    ↓
Model Versioning (MLflow)
    ↓
Model Deployment (FastAPI endpoint)
    ↓
A/B Testing (compare vs rule-based)
    ↓
Monitoring & Retraining
```

### 14.2 ML Service Integration

```python
# backend/app/services/ml_service.py

class MLService:
    def __init__(self):
        self.model = self.load_model()

    def predict_next_weight(self, user_history: List[Set]) -> float:
        """Use ML model to predict optimal next weight"""
        features = self.extract_features(user_history)
        prediction = self.model.predict(features)
        return prediction

    def predict_set_adjustment(self, feedback: Feedback, history: List[Workout]) -> int:
        """Use ML model for auto-regulation"""
        features = self.extract_feedback_features(feedback, history)
        adjustment = self.model.predict(features)
        return int(adjustment)
```

## 15. Security Checklist

- [ ] HTTPS enforced in production
- [ ] JWT tokens expire and refresh
- [ ] Password hashing (bcrypt/argon2)
- [ ] SQL injection prevention (ORM)
- [ ] XSS prevention (React escaping)
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] CORS whitelist
- [ ] Input validation (Pydantic)
- [ ] Environment variables for secrets
- [ ] Database backups automated
- [ ] Error messages don't leak sensitive info
- [ ] Dependency vulnerability scanning

## 16. Next Steps

1. **Set up monorepo structure**
2. **Initialize FastAPI backend**
   - Set up SQLAlchemy models
   - Create Alembic migrations
   - Implement auth system
3. **Initialize React frontend**
   - Set up Vite + TypeScript
   - Configure Tailwind CSS
   - Set up PWA config
4. **Design and implement database schema**
5. **Create API endpoints**
6. **Build core UI components**
7. **Implement progressive overload logic**
8. **Add offline support**
9. **Deploy to staging environment**
10. **User testing and iteration**

---

## Appendix: Technology Alternatives

### If You Want Simpler Setup:
- **Supabase** for everything (database + auth + real-time + storage)
- **Next.js** for frontend (combines React + API routes)

### If You Want Different Stack:
- **Backend:** Django REST Framework (more batteries-included)
- **Frontend:** Vue.js (simpler than React), Svelte (even simpler)
- **Database:** MongoDB if you prefer document-based (less ideal for relational data)

### If You Want All-in-One:
- **Firebase** (database + auth + hosting) - but less control, vendor lock-in
