"""Main FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup and shutdown tasks."""
    # Startup: Seed database with stock data
    db = SessionLocal()
    try:
        from app.utils.seed_exercises import seed_exercises
        from app.utils.seed_mesocycles import seed_mesocycles

        seed_exercises(db)
        seed_mesocycles(db)
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

    yield  # App runs here

    # Shutdown tasks (if any)


# Create FastAPI app
app = FastAPI(
    title="Metric Gain API",
    description="Progressive Web App for Workout Tracking with Auto-Regulation",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "Metric Gain API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
    }


# Import and include routers
from app.routers import auth, exercises, mesocycles, mesocycle_instances, workout_sessions

app.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
app.include_router(exercises.router, prefix="/v1/exercises", tags=["Exercises"])
app.include_router(mesocycles.router, prefix="/v1/mesocycles", tags=["Mesocycle Templates"])
app.include_router(mesocycle_instances.router, prefix="/v1/mesocycle-instances", tags=["Mesocycle Instances"])
app.include_router(workout_sessions.router, prefix="/v1", tags=["Workout Sessions"])
