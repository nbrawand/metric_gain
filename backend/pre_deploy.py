"""Pre-deploy script: run migrations and seed stock data."""

from app.database import SessionLocal
from app.utils.seed_exercises import seed_exercises
from app.utils.seed_mesocycles import seed_mesocycles

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_exercises(db)
        seed_mesocycles(db)
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()
