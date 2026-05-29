import sys
import os
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.database import engine
from sqlalchemy import text
from loguru import logger

def upgrade():
    with engine.begin() as conn:
        logger.info("Adding call_flow column to agent table...")
        conn.execute(text("ALTER TABLE agent ADD COLUMN IF NOT EXISTS call_flow JSONB DEFAULT '{}';"))
        logger.info("Migration complete.")

if __name__ == "__main__":
    upgrade()
