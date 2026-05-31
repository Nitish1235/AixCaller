import sys
import os
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from shared.database import engine
from sqlalchemy import text
from loguru import logger

def upgrade():
    with engine.begin() as conn:
        logger.info("Adding daily_call_limit column to campaign table...")
        conn.execute(text(
            "ALTER TABLE campaign ADD COLUMN IF NOT EXISTS daily_call_limit INTEGER DEFAULT NULL;"
        ))
        logger.info("Migration complete: daily_call_limit added.")

if __name__ == "__main__":
    upgrade()
