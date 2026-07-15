#!/usr/bin/env python3
"""MCP server that gives Claude tools to control TrainingPeaks.

Proxies requests through the Vercel endpoint at sql-load.vercel.app.

Setup:
  pip install mcp httpx

  Add to Claude Desktop config (~/.claude/claude_desktop_config.json):
  {
    "mcpServers": {
      "trainingpeaks": {
        "command": "python3",
        "args": ["/Users/alexandrkasparek/sql_load/trainingpeaks/tp_mcp_server.py"],
        "env": {
          "TP_PROXY_URL": "https://sql-load.vercel.app/api/cyclofuel-db?tp_proxy=1",
          "TP_PROXY_SECRET": "qbS/APtTkyL0ajkUVyKfTvfCGlPvluxVmeXFOd8AxY4="
        }
      }
    }
  }
"""

import json
import os
from datetime import date, timedelta

import httpx
from mcp.server.fastmcp import FastMCP

PROXY_URL = os.environ.get(
    "TP_PROXY_URL",
    "https://sql-load.vercel.app/api/cyclofuel-db?tp_proxy=1",
)
PROXY_SECRET = os.environ.get("TP_PROXY_SECRET", "")
ATHLETE_ID = 5957855

mcp = FastMCP("TrainingPeaks Coach")


async def _tp_call(method: str, path: str, body: dict | None = None) -> dict:
    payload = {"method": method, "path": path}
    if body is not None:
        payload["body"] = body
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            PROXY_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {PROXY_SECRET}",
            },
        )
        return r.json()


@mcp.tool()
async def list_workout_types() -> str:
    """List all available TrainingPeaks workout types and subtypes."""
    data = await _tp_call("GET", "/fitness/v6/workouttypes")
    types = data.get("data", data) if isinstance(data, dict) else data
    if not isinstance(types, list):
        return json.dumps(data, indent=2)
    lines = []
    for t in types:
        tid = t.get("id") or t.get("workoutTypeId")
        name = t.get("name", "?")
        lines.append(f"{tid}: {name}")
        for st in t.get("subTypes", []):
            stid = st.get("id") or st.get("workoutTypeId")
            stname = st.get("name", "?")
            lines.append(f"  └─ {stid}: {stname}")
    return "\n".join(lines)


@mcp.tool()
async def get_workouts(start_date: str = "", end_date: str = "", days_back: int = 14) -> str:
    """Get workouts from TrainingPeaks for a date range.

    Args:
        start_date: Start date YYYY-MM-DD (default: today minus days_back)
        end_date: End date YYYY-MM-DD (default: today)
        days_back: Number of days to look back if start_date not given (default 14)
    """
    today = date.today()
    end = date.fromisoformat(end_date) if end_date else today
    start = date.fromisoformat(start_date) if start_date else today - timedelta(days=days_back)
    path = f"/fitness/v6/athletes/{ATHLETE_ID}/workouts/{start.isoformat()}/{end.isoformat()}"
    data = await _tp_call("GET", path)
    workouts = data.get("data", data) if isinstance(data, dict) else data
    if not isinstance(workouts, list):
        return json.dumps(data, indent=2)
    results = []
    for w in workouts:
        wid = w.get("workoutId", "?")
        d = (w.get("workoutDay") or "")[:10]
        title = w.get("title", "untitled")
        completed = "✓" if w.get("completed") else "○"
        duration = w.get("totalTime") or w.get("totalTimePlanned")
        dur_str = ""
        if duration:
            h, rem = divmod(int(duration), 3600)
            m, _ = divmod(rem, 60)
            dur_str = f" ({h}h{m:02d}m)" if h else f" ({m}m)"
        tss = w.get("tssActual") or w.get("tssPlanned")
        tss_str = f" TSS:{tss:.0f}" if tss else ""
        results.append(f"{completed} {d} | {title}{dur_str}{tss_str} [id:{wid}]")
    return "\n".join(results) if results else "No workouts found."


@mcp.tool()
async def get_fitness(days_back: int = 30) -> str:
    """Get PMC fitness data (CTL/ATL/TSB) from TrainingPeaks.

    Args:
        days_back: Number of days to look back (default 30)
    """
    today = date.today()
    start = today - timedelta(days=days_back)
    path = f"/fitness/v1/athletes/{ATHLETE_ID}/reporting/performancedata/{start.isoformat()}/{today.isoformat()}"
    body = {
        "atlConstant": 7,
        "atlStart": 0,
        "ctlConstant": 42,
        "ctlStart": 0,
        "workoutTypes": [],
    }
    data = await _tp_call("POST", path, body)
    raw = data.get("data", data) if isinstance(data, dict) else data
    if not isinstance(raw, list):
        return json.dumps(data, indent=2)
    lines = ["Date       | TSS  | CTL  | ATL  | TSB"]
    lines.append("-" * 45)
    for entry in raw:
        d = (entry.get("date") or entry.get("workoutDay") or "")[:10]
        if not d:
            continue
        tss = entry.get("tssActual") or entry.get("tss") or 0
        ctl = entry.get("ctl") or 0
        atl = entry.get("atl") or 0
        tsb = entry.get("tsb") or 0
        lines.append(f"{d} | {tss:4.0f} | {ctl:4.1f} | {atl:4.1f} | {tsb:+5.1f}")
    return "\n".join(lines)


@mcp.tool()
async def create_workout(
    date: str,
    title: str,
    description: str = "",
    workout_type: int | None = None,
    duration_seconds: int | None = None,
    distance_km: float | None = None,
    tss: float | None = None,
    intensity_factor: float | None = None,
) -> str:
    """Create a planned workout on TrainingPeaks.

    Args:
        date: Workout date YYYY-MM-DD
        title: Workout title
        description: Workout description / instructions
        workout_type: Workout type ID (use list_workout_types to see options, e.g. 2=Bike, 3=Run, 1=Swim)
        duration_seconds: Planned duration in seconds
        distance_km: Planned distance in kilometers
        tss: Planned TSS (Training Stress Score)
        intensity_factor: Planned IF (Intensity Factor, 0.0-1.5)
    """
    body = {
        "athleteId": ATHLETE_ID,
        "workoutDay": f"{date}T00:00:00",
        "title": title,
        "description": description,
    }
    if workout_type is not None:
        body["workoutTypeValueId"] = workout_type
    if duration_seconds is not None:
        body["totalTimePlanned"] = duration_seconds
    if distance_km is not None:
        body["distancePlanned"] = distance_km
    if tss is not None:
        body["tssPlanned"] = tss
    if intensity_factor is not None:
        body["ifPlanned"] = intensity_factor

    path = f"/fitness/v6/athletes/{ATHLETE_ID}/workouts"
    data = await _tp_call("POST", path, body)
    result = data.get("data", data) if isinstance(data, dict) else data
    if isinstance(result, dict):
        wid = result.get("workoutId") or result.get("id")
        return f"Created workout {wid}: {title} on {date}"
    return json.dumps(data, indent=2)


@mcp.tool()
async def update_workout(
    workout_id: int,
    title: str | None = None,
    description: str | None = None,
    date: str | None = None,
    workout_type: int | None = None,
    duration_seconds: int | None = None,
    distance_km: float | None = None,
    tss: float | None = None,
    intensity_factor: float | None = None,
) -> str:
    """Update an existing workout on TrainingPeaks.

    Args:
        workout_id: The workout ID to update
        title: New title
        description: New description
        date: Move to this date YYYY-MM-DD
        workout_type: New workout type ID
        duration_seconds: New planned duration in seconds
        distance_km: New planned distance in km
        tss: New planned TSS
        intensity_factor: New planned IF
    """
    path = f"/fitness/v6/athletes/{ATHLETE_ID}/workouts/{workout_id}"
    existing = await _tp_call("GET", path)
    workout = existing.get("data", existing) if isinstance(existing, dict) else existing
    if not isinstance(workout, dict):
        return f"Workout {workout_id} not found."

    field_map = {
        "title": ("title", title),
        "description": ("description", description),
        "workout_type": ("workoutTypeValueId", workout_type),
        "duration_seconds": ("totalTimePlanned", duration_seconds),
        "distance_km": ("distancePlanned", distance_km),
        "tss": ("tssPlanned", tss),
        "intensity_factor": ("ifPlanned", intensity_factor),
    }
    for _, (api_key, val) in field_map.items():
        if val is not None:
            workout[api_key] = val
    if date is not None:
        workout["workoutDay"] = f"{date}T00:00:00"

    data = await _tp_call("PUT", path, workout)
    return f"Updated workout {workout_id}"


@mcp.tool()
async def delete_workout(workout_id: int) -> str:
    """Delete a workout from TrainingPeaks.

    Args:
        workout_id: The workout ID to delete
    """
    path = f"/fitness/v6/athletes/{ATHLETE_ID}/workouts/{workout_id}"
    data = await _tp_call("DELETE", path)
    return f"Deleted workout {workout_id}"


@mcp.tool()
async def add_workout_comment(workout_id: int, text: str) -> str:
    """Add a comment to a workout on TrainingPeaks.

    Args:
        workout_id: The workout ID to comment on
        text: Comment text
    """
    path = f"/fitness/v2/athletes/{ATHLETE_ID}/workouts/{workout_id}/comments"
    data = await _tp_call("POST", path, {"value": text})
    return f"Comment added to workout {workout_id}"


if __name__ == "__main__":
    mcp.run()
