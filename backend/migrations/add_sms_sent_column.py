"""
Database Migration: Add sms_sent column to CallRecord
"""
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from dotenv import load_dotenv
load_dotenv()

from shared.database import engine
from sqlalchemy import text

def upgrade():
    with engine.begin() as conn:
        print("Adding sms_sent column to callrecord table...")
        conn.execute(text(
            "ALTER TABLE callrecord ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE;"
        ))
        print("Migration complete: sms_sent added.")

if __name__ == "__main__":
    upgrade()
