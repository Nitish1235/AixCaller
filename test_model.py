import sys
import os
sys.path.append(os.getcwd())
try:
    from shared.models import Agent
    agent = Agent(
        tenant_id="00000000-0000-0000-0000-000000000000",
        name="Test Agent",
        system_prompt="Test",
        phone_number="+1234567890",
        tools_config={"call_flow": {"test": 1}}
    )
    print("Agent created:")
    print("phone_number:", agent.phone_number)
    print("dump:", agent.model_dump())
    
    # Test JSON serialization
    print("json:", agent.model_dump_json())
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
