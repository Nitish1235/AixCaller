"""
Database Migration: Add sms_sent column to CallRecord
"""
import asyncio
from sqlmodel import Session, text
from shared.database import engine

async def migrate():
    with engine.begin() as conn:
        print("Adding sms_sent column to callrecord table...")
        try:
            conn.execute(text("ALTER TABLE callrecord ADD COLUMN sms_sent BOOLEAN DEFAULT FALSE;"))
            print("Successfully added sms_sent column.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column sms_sent already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
