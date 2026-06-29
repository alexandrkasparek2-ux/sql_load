#!/usr/bin/env python3
"""Pull Garmin Connect data (activities + wellness) into files or POST to an endpoint.

Uses the python-garminconnect library by cyberjunky:
https://github.com/cyberjunky/python-garminconnect

Usage:
  # One-time login (saves token locally, prints base64 bundle for CI)
  GARMIN_EMAIL="you@example.com" GARMIN_PASSWORD="pw" python sync_garmin.py --login

  # Pull last 3 days, write markdown files
  python sync_garmin.py --days 3 --sink files --out ./garmin

  # Dry run — just print what would be synced
  python sync_garmin.py --days 3 --dry-run

  # POST to your own endpoint
  GARMIN_INGEST_URL="https://..." GARMIN_INGEST_SECRET="..." python sync_garmin.py --days 3 --sink supabase
"""

import argparse
import base64
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from garminconnect import Garmin

TOKEN_DIR = Path.home() / ".garmin_tokens"
TOKEN_FILE = TOKEN_DIR / "tokens.json"


def save_tokens_local(garmin):
    TOKEN_DIR.mkdir(parents=True, exist_ok=True)
    token_data = garmin.garth.dumps()
    TOKEN_FILE.write_text(token_data)
    return token_data


def load_client():
    token_b64 = os.environ.get("GARMIN_TOKEN_B64")
    if token_b64:
        token_data = base64.b64decode(token_b64).decode("utf-8")
        garmin = Garmin()
        garmin.garth.loads(token_data)
        garmin.login()
        return garmin

    if TOKEN_FILE.exists():
        token_data = TOKEN_FILE.read_text()
        garmin = Garmin()
        garmin.garth.loads(token_data)
        garmin.login()
        save_tokens_local(garmin)
        return garmin

    raise SystemExit(
        "No Garmin token found. Run with --login first, or set GARMIN_TOKEN_B64."
    )


def do_login():
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        raise SystemExit("Set GARMIN_EMAIL and GARMIN_PASSWORD environment variables.")

    garmin = Garmin(email, password)
    garmin.login()
    token_data = save_tokens_local(garmin)
    bundle = base64.b64encode(token_data.encode("utf-8")).decode("utf-8")

    print("Login successful. Token saved to", TOKEN_FILE)
    print()
    print("=== Base64 token bundle (for GitHub Actions secret GARMIN_TOKEN_B64) ===")
    print(bundle)
    print("=== end ===")
    return garmin


def fetch_wellness(garmin, day):
    d = day.isoformat()
    w = {}

    try:
        stats = garmin.get_stats(d)
        w["resting_hr"] = stats.get("restingHeartRate")
        w["steps"] = stats.get("totalSteps")
        w["stress_avg"] = stats.get("averageStressLevel")
    except Exception:
        pass

    try:
        sleep = garmin.get_sleep_data(d)
        ds = sleep.get("dailySleepDTO", {})
        w["sleep_seconds"] = ds.get("sleepTimeSeconds")
        w["sleep_score"] = ds.get("sleepScores", {}).get("overall", {}).get("value")
    except Exception:
        pass

    try:
        hrv = garmin.get_hrv_data(d)
        summary = hrv.get("hrvSummary", {})
        w["hrv_overnight"] = summary.get("lastNightAvg")
    except Exception:
        pass

    try:
        bb = garmin.get_body_battery(d)
        events = bb if isinstance(bb, list) else bb.get("bodyBatteryValuesArray", bb.get("dateTimeBatteryLevel", []))
        if events and isinstance(events, list):
            vals = [e.get("batteryLevel", e[-1]) if isinstance(e, dict) else e[-1] for e in events if (isinstance(e, dict) and e.get("batteryLevel") is not None) or (isinstance(e, list) and len(e) >= 2)]
            if vals:
                w["body_battery_low"] = min(vals)
                w["body_battery_high"] = max(vals)
    except Exception:
        pass

    try:
        tr = garmin.get_training_readiness(d)
        if isinstance(tr, list) and tr:
            tr = tr[0]
        if isinstance(tr, dict):
            w["training_readiness"] = tr.get("score") or tr.get("trainingReadinessScore")
    except Exception:
        pass

    return w


def fetch_activities(garmin, start, end):
    raw = garmin.get_activities_by_date(start.isoformat(), end.isoformat())
    activities = []
    for a in raw:
        activities.append({
            "id": a.get("activityId"),
            "name": a.get("activityName", ""),
            "type": a.get("activityType", {}).get("typeKey", "unknown"),
            "start": a.get("startTimeLocal", ""),
            "duration_s": a.get("duration"),
            "distance_m": a.get("distance"),
            "calories": a.get("calories"),
            "avg_hr": a.get("averageHR"),
            "max_hr": a.get("maxHR"),
            "elevation_m": a.get("elevationGain"),
            "avg_power": a.get("avgPower"),
            "norm_power": a.get("normPower"),
            "training_effect_aerobic": a.get("aerobicTrainingEffect"),
            "training_effect_anaerobic": a.get("anaerobicTrainingEffect"),
            "vo2max": a.get("vO2MaxValue"),
        })
    return activities


def format_duration(seconds):
    if not seconds:
        return "?"
    h, rem = divmod(int(seconds), 3600)
    m, _ = divmod(rem, 60)
    return f"{h}h {m}m" if h else f"{m}m"


def format_distance(meters):
    if not meters:
        return "?"
    return f"{meters / 1000:.1f} km"


def wellness_markdown(day, w):
    lines = [f"# Garmin wellness {day.isoformat()}"]
    if w.get("resting_hr"):
        lines.append(f"- Resting HR: {w['resting_hr']} bpm")
    if w.get("hrv_overnight"):
        lines.append(f"- HRV (overnight): {w['hrv_overnight']} ms")
    if w.get("sleep_seconds"):
        hours = w["sleep_seconds"] / 3600
        score_part = f" (score {w['sleep_score']})" if w.get("sleep_score") else ""
        lines.append(f"- Sleep: {hours:.1f} h{score_part}")
    if w.get("body_battery_low") is not None and w.get("body_battery_high") is not None:
        lines.append(f"- Body battery: {w['body_battery_low']} -> {w['body_battery_high']}")
    if w.get("stress_avg"):
        lines.append(f"- Stress (avg): {w['stress_avg']}")
    if w.get("steps"):
        lines.append(f"- Steps: {w['steps']}")
    if w.get("training_readiness"):
        lines.append(f"- Training readiness: {w['training_readiness']}")
    return "\n".join(lines) + "\n"


def activity_markdown(a):
    lines = [f"# {a['name'] or a['type']} — {a['start'][:10] if a.get('start') else '?'}"]
    lines.append(f"- Type: {a['type']}")
    lines.append(f"- Duration: {format_duration(a.get('duration_s'))}")
    lines.append(f"- Distance: {format_distance(a.get('distance_m'))}")
    if a.get("calories"):
        lines.append(f"- Calories: {a['calories']} kcal")
    if a.get("avg_hr"):
        lines.append(f"- Avg HR: {a['avg_hr']} bpm")
    if a.get("max_hr"):
        lines.append(f"- Max HR: {a['max_hr']} bpm")
    if a.get("elevation_m"):
        lines.append(f"- Elevation: {a['elevation_m']:.0f} m")
    if a.get("avg_power"):
        lines.append(f"- Avg power: {a['avg_power']} W")
    if a.get("norm_power"):
        lines.append(f"- Norm power: {a['norm_power']} W")
    if a.get("training_effect_aerobic"):
        lines.append(f"- Aerobic TE: {a['training_effect_aerobic']}")
    if a.get("training_effect_anaerobic"):
        lines.append(f"- Anaerobic TE: {a['training_effect_anaerobic']}")
    if a.get("vo2max"):
        lines.append(f"- VO2max: {a['vo2max']}")
    return "\n".join(lines) + "\n"


def sink_files(days_data, out_dir):
    out = Path(out_dir)
    daily_dir = out / "daily"
    act_dir = out / "activities"
    daily_dir.mkdir(parents=True, exist_ok=True)
    act_dir.mkdir(parents=True, exist_ok=True)

    for day, wellness, activities in days_data:
        md = wellness_markdown(day, wellness)
        (daily_dir / f"{day.isoformat()}.md").write_text(md, encoding="utf-8")

        for a in activities:
            slug = f"{a['start'][:10]}-{a['type']}-{a['id']}" if a.get("start") else f"{day.isoformat()}-{a['id']}"
            (act_dir / f"{slug}.md").write_text(activity_markdown(a), encoding="utf-8")

    store = {
        "synced_at": datetime.utcnow().isoformat() + "Z",
        "days": [
            {
                "date": day.isoformat(),
                "wellness": wellness,
                "activities": activities,
            }
            for day, wellness, activities in days_data
        ],
    }
    (out / "data.json").write_text(json.dumps(store, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {len(days_data)} day(s) to {out}/")


def sink_supabase(days_data):
    import requests as req

    url = os.environ.get("GARMIN_INGEST_URL")
    secret = os.environ.get("GARMIN_INGEST_SECRET")
    if not url:
        raise SystemExit("Set GARMIN_INGEST_URL for supabase sink.")

    payload = {
        "activities": [],
        "wellness": [],
    }
    for day, wellness, activities in days_data:
        payload["wellness"].append({"date": day.isoformat(), **wellness})
        payload["activities"].extend(activities)

    headers = {"Content-Type": "application/json"}
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    r = req.post(url, json=payload, headers=headers, timeout=30)
    if r.ok:
        print(f"POST {url} -> {r.status_code}")
    else:
        print(f"POST {url} -> {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Sync Garmin Connect data")
    parser.add_argument("--login", action="store_true", help="Login and save token")
    parser.add_argument("--days", type=int, default=3, help="Days to look back (default 3)")
    parser.add_argument("--sink", choices=["files", "supabase"], default="files", help="Where to send data")
    parser.add_argument("--out", default="./garmin", help="Output directory for files sink")
    parser.add_argument("--dry-run", action="store_true", help="Print data without saving")
    args = parser.parse_args()

    if args.login:
        garmin = do_login()
    else:
        garmin = load_client()

    today = date.today()
    start = today - timedelta(days=args.days - 1)

    print(f"Fetching {args.days} day(s): {start} to {today}")

    days_data = []
    for i in range(args.days):
        day = start + timedelta(days=i)
        print(f"  {day} ...", end=" ", flush=True)
        wellness = fetch_wellness(garmin, day)
        activities = fetch_activities(garmin, day, day)
        days_data.append((day, wellness, activities))
        print(f"{len(activities)} activities")

    if args.dry_run:
        print()
        for day, wellness, activities in days_data:
            print(wellness_markdown(day, wellness))
            for a in activities:
                print(activity_markdown(a))
        return

    if args.sink == "files":
        sink_files(days_data, args.out)
    elif args.sink == "supabase":
        sink_supabase(days_data)


if __name__ == "__main__":
    main()
