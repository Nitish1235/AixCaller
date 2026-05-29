import sys
import os
from dotenv import load_dotenv
load_dotenv()

sys.path.append(os.getcwd())
try:
    from shared.database import engine
    from sqlmodel import Session, select
    from shared.models import Agent
    with Session(engine) as session:
        agents = session.exec(select(Agent)).all()
        for a in agents:
            print(f"Agent {a.id}: phone={a.phone_number}")
except Exception as e:
    import traceback
    traceback.print_exc()
