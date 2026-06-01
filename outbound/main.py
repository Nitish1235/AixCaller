import os
import uvicorn
from fastapi import FastAPI, BackgroundTasks
from loguru import logger
from outbound.api.webhooks import router as webhooks_router
from outbound.api.campaigns import router as campaigns_router
from outbound.services.reminder_engine import run_reminder_sweep

app = FastAPI(title="AIxCaller Outbound Microservice")

# Include routers
app.include_router(webhooks_router)
app.include_router(campaigns_router)

# Cron endpoint removed in favor of ARQ dialer


@app.post("/api/v1/outbound/cron-reminders")
async def trigger_reminder_sweep(background_tasks: BackgroundTasks):
    """
    Reminder cron — triggered every 15 minutes by Cloud Scheduler.
    Finds leads with appointments in the next 24 hours and fires reminder SMS.
    (Upgrade 4 — No-Show Reminder Engine)
    """
    logger.info("Appointment reminder sweep triggered.")
    background_tasks.add_task(run_reminder_sweep)
    return {"status": "triggered", "message": "Appointment reminder sweep initiated in background."}


@app.get("/healthz")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("outbound.main:app", host="0.0.0.0", port=port, reload=False)

