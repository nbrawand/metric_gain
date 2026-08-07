"""Main FastAPI application."""

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.config import settings
from app.utils.auth import require_active_subscription
from app.utils.ratelimit import limiter


# The interactive docs publish every route, schema and field name in the app.
# There is no reason to hand that to the internet in production.
_docs_enabled = not settings.is_production

# Create FastAPI app
app = FastAPI(
    title="Strength Guider API",
    description="Plan a training block, then train it with guided weight and RIR targets",
    version="0.1.0",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Attach baseline security headers to every API response."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    # The API serves JSON, never a document worth framing
    response.headers.setdefault("X-Frame-Options", "DENY")
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "Strength Guider API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs" if _docs_enabled else None,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
    }


# Import and include routers
from app.routers import account, admin, analytics, auth, billing, exercises, mesocycle_instances, mesocycles, workout_sessions

sub_guard = [Depends(require_active_subscription)]

# Guard the whole admin surface at the mount rather than relying on each route
# to remember. The per-route dependency stays too; this is the half that keeps
# a newly added endpoint closed by default instead of open by default.
admin_guard = [Depends(admin.require_admin)]

app.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
app.include_router(billing.router, prefix="/v1/billing", tags=["Billing"])
# No subscription guard: a lapsed subscriber must still be able to take
# their data out and close their account.
app.include_router(account.router, prefix="/v1/account", tags=["Account"])
app.include_router(admin.router, prefix="/v1/admin", tags=["Admin"], dependencies=admin_guard)
app.include_router(exercises.router, prefix="/v1/exercises", tags=["Exercises"], dependencies=sub_guard)
app.include_router(mesocycles.router, prefix="/v1/mesocycles", tags=["Mesocycle Templates"], dependencies=sub_guard)
app.include_router(mesocycle_instances.router, prefix="/v1/mesocycle-instances", tags=["Mesocycle Instances"], dependencies=sub_guard)
app.include_router(workout_sessions.router, prefix="/v1", tags=["Workout Sessions"], dependencies=sub_guard)
app.include_router(analytics.router, prefix="/v1/analytics", tags=["Analytics"], dependencies=sub_guard)
