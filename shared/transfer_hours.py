"""
Human-transfer availability check.

Decides whether the AI should be allowed to transfer the current call to a
human right now, based on:
  - Master enable switch
  - Whether a forwarding number is set
  - Whether the current time (in the agent's configured timezone) falls inside
    one of the staffed-hours windows
"""
from datetime import datetime
from typing import Optional
from loguru import logger

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    ZoneInfo = None  # type: ignore


# ─── Standard default hours we recommend to new users ───────────────────────
# Mon-Fri 9 AM – 6 PM, Saturday half-day 10 AM – 2 PM, Sunday closed.
# This matches typical small-business staffing patterns.
DEFAULT_HOURS = {
    "mon": ["09:00-18:00"],
    "tue": ["09:00-18:00"],
    "wed": ["09:00-18:00"],
    "thu": ["09:00-18:00"],
    "fri": ["09:00-18:00"],
    "sat": ["10:00-14:00"],
    "sun": [],
}

# Always-open preset (for users who staff 24/7)
ALWAYS_OPEN_HOURS = {d: ["00:00-23:59"] for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}

# Weekdays-only preset
WEEKDAYS_ONLY_HOURS = {
    "mon": ["09:00-18:00"], "tue": ["09:00-18:00"], "wed": ["09:00-18:00"],
    "thu": ["09:00-18:00"], "fri": ["09:00-18:00"], "sat": [], "sun": [],
}

# Python weekday() → 0=Mon ... 6=Sun
_WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _parse_window(window: str) -> Optional[tuple[int, int]]:
    """'09:00-18:00' → (540, 1080) minutes from midnight. Returns None if invalid."""
    try:
        start_str, end_str = window.split("-")
        sh, sm = map(int, start_str.split(":"))
        eh, em = map(int, end_str.split(":"))
        start_mins = sh * 60 + sm
        end_mins = eh * 60 + em
        if start_mins < 0 or end_mins > 24 * 60 or start_mins >= end_mins:
            return None
        return start_mins, end_mins
    except Exception:
        return None


def is_human_transfer_available(
    *,
    enabled: bool,
    forwarding_number: Optional[str],
    timezone: str,
    hours: dict,
    now: Optional[datetime] = None,
) -> tuple[bool, str]:
    """Check if a human-transfer is allowed right this moment.

    Returns (available, reason). The reason is a short string the AI can use
    to gracefully explain when off-hours.
    """
    if not enabled:
        return False, "Human transfer is disabled for this agent."

    if not forwarding_number:
        return False, "No forwarding number configured."

    if not hours:
        # No windows defined at all — treat as always closed.
        return False, "No staffed hours have been configured."

    # Resolve timezone
    if ZoneInfo is None:
        logger.warning("zoneinfo unavailable — falling back to UTC for transfer-hours check")
        tz_now = (now or datetime.utcnow())
    else:
        try:
            tz = ZoneInfo(timezone or "UTC")
        except Exception:
            logger.warning(f"Invalid timezone '{timezone}' — falling back to UTC")
            tz = ZoneInfo("UTC")
        tz_now = (now or datetime.now(tz)).astimezone(tz)

    day_key = _WEEKDAY_KEYS[tz_now.weekday()]
    windows = hours.get(day_key, [])
    if not windows:
        return False, f"Our team isn't available right now ({_pretty_day(day_key)}). " + _next_open_summary(hours, tz_now)

    cur_mins = tz_now.hour * 60 + tz_now.minute
    for window in windows:
        parsed = _parse_window(window)
        if parsed is None:
            continue
        start_mins, end_mins = parsed
        if start_mins <= cur_mins <= end_mins:
            return True, "Within staffed hours."

    return False, f"Our team is currently outside business hours. " + _next_open_summary(hours, tz_now)


def _pretty_day(key: str) -> str:
    return {"mon": "Monday", "tue": "Tuesday", "wed": "Wednesday",
            "thu": "Thursday", "fri": "Friday", "sat": "Saturday", "sun": "Sunday"}.get(key, key)


def _next_open_summary(hours: dict, now: datetime) -> str:
    """Return a short string like 'Our hours are Mon-Fri 9 AM to 6 PM.' for the AI to repeat."""
    # Detect simple Mon-Fri-same-hours pattern → friendly summary
    weekday_windows = [hours.get(d, []) for d in ["mon", "tue", "wed", "thu", "fri"]]
    if all(w == weekday_windows[0] and weekday_windows[0] for w in weekday_windows):
        return f"Our team is available Monday to Friday, {weekday_windows[0][0].replace('-', ' to ')}."
    return "Please call back during our regular business hours."
