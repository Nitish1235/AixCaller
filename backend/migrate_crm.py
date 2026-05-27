import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Try to load .env from the current directory
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not set. Please ensure you have a .env file with DATABASE_URL.")
    exit(1)

engine = create_engine(DATABASE_URL)

queries = [
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS hubspot_access_token TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS hubspot_refresh_token TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS hubspot_token_expires_at BIGINT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS salesforce_access_token TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS salesforce_refresh_token TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS salesforce_token_expires_at BIGINT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS salesforce_instance_url TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS webhook_url TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS shopify_domain TEXT;",
    "ALTER TABLE tenant ADD COLUMN IF NOT EXISTS shopify_token TEXT;"
]

with engine.connect() as conn:
    for q in queries:
        print(f"Executing: {q}")
        conn.execute(text(q))
    conn.commit()

print("CRM columns migration completed successfully!")
