import os
from dotenv import load_dotenv

# Load env variables before doing anything else
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "outbound", ".env"))

from arq.connections import RedisSettings
from arq.cron import cron
from outbound.services.dialer_tasks import (
    start_campaign,
    dial_next_lead,
    reconcile_stuck_calls,
    check_scheduled_campaigns,
)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class WorkerSettings:
    """
    Settings for the ARQ worker process.
    Run this with: `arq outbound.worker.WorkerSettings`
    """
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
    functions = [start_campaign, dial_next_lead, reconcile_stuck_calls, check_scheduled_campaigns]
    cron_jobs = [
        # Check for due scheduled campaigns every minute
        cron(check_scheduled_campaigns, second=0),
        # Reset stuck in-progress leads every 5 minutes (was 15 — too slow for live campaigns)
        cron(reconcile_stuck_calls, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),
    ]
