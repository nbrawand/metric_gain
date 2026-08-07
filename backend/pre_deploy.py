"""Pre-deploy script: seed stock exercises and mesocycle templates.

Run after migrations. Exits non-zero on failure so a deploy that could not
seed is not reported as successful — a silent failure here leaves every user
looking at an empty exercise library.
"""

import sys

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
        sys.exit(1)
    finally:
        db.close()
