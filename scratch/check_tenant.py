import uuid
from sqlmodel import Session, select
from shared.database import engine
from shared.models import Tenant

def check_tenant(email: str):
    with Session(engine) as session:
        statement = select(Tenant).where(Tenant.contact_email == email)
        results = session.exec(statement).all()
        
        print(f"Found {len(results)} tenant(s) for email: {email}")
        for t in results:
            print(f"ID: {t.id}")
            print(f"Plan Tier: {t.plan_tier}")
            print(f"Subscription Status: {t.subscription_status}")
            print(f"Minutes Included: {t.minutes_included}")
            print(f"Minutes Used: {t.minutes_used}")
            print(f"Is Active: {t.is_active}")
            print("-" * 20)

if __name__ == "__main__":
    # Replace with the email you tried to assign
    check_tenant("nitish.dev.165@gmail.com") # I'll assume this is the email based on previous context, but user should tell me
