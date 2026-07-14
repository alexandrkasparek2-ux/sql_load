#!/usr/bin/env python3
"""Pull TrainingPeaks data (workouts + PMC fitness) into files or POST to an endpoint.

Uses TrainingPeaks internal API via session cookie authentication.

Usage:
  # Store cookie from browser (get Production_tpAuth from DevTools)
  python sync_tp.py --store-cookie "your_cookie_value_here"

  # Pull last 14 days, write markdown files
  python sync_tp.py --days 14 --sink files --out ./tp_data

  # Dry run — just print what would be synced
  python sync_tp.py --days 14 --dry-run

  # POST to your CycloFuel endpoint
  TP_INGEST_URL="https://..." TP_INGEST_SECRET="..." python sync_tp.py --days 14 --sink supabase
"""

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import requests

TP_API_BASE = "https://tpapi.trainingpeaks.com"
TOKEN_DIR = Path.home() / ".tp_tokens"
COOKIE_FILE = TOKEN_DIR / "cookie.txt"


def save_cookie(value):
    TOKEN_DIR.mkdir(parents=True, exist_ok=True)
    COOKIE_FILE.write_text(value.strip())
    print(f"Cookie saved to {COOKIE_FILE}")


def load_cookie():
    cookie = os.environ.get("TP_AUTH_COOKIE")
    if cookie:
        return cookie.strip()
    if COOKIE_FILE.exists():
        return COOKIE_FILE.read_text().strip()
    raise SystemExit(
        "No TP cookie found. Run with --store-cookie or set TP_AUTH_COOKIE."
    )


def exchange_token(cookie):
    r = requests.get(
        f"{TP_API_BASE}/users/v3/token",
        headers={
            "Cookie": f"Production_tpAuth={cookie}",
            "Accept": "application/json",
            "Referer": "https://app.trainingpeaks.com/",
        },
        timeout=30,
    )
    if not r.ok:
        raise SystemExit(f"Token exchange failed ({r.status_code}): {r.text[:200]}\nCookie may be expired — log in to trainingpeaks.com and re-export.")
    data = r.json()
    token_obj = data.get("token")
    if isinstance(token_obj, dict):
        token = token_obj.get("access_token")
    else:
        token = data.get("access_token") or token_obj
    if not token or not isinstance(token, str):
        raise SystemExit(f"No access_token in response: {json.dumps(data, indent=2)[:500]}")
    return token


def tp_get(token, path):
    r = requests.get(
        f"{TP_API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        timeout=30,
    )
    if not r.ok:
        print(f"  GET {path} -> {r.status_code}", file=sys.stderr)
        return None
    return r.json()


def tp_post(token, path, body):
    r = requests.post(
        f"{TP_API_BASE}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=30,
    )
    if not r.ok:
        print(f"  POST {path} -> {r.status_code}", file=sys.stderr)
        return None
    return r.json()


def get_athlete_id(token):
    data = tp_get(token, "/users/v3/user")
    if not data:
        raise SystemExit("Could not fetch user profile from TrainingPeaks.")
    if data.get("athletes"):
        return data["athletes"][0]["athleteId"]
    if data.get("userId"):
        return data["userId"]
    if data.get("athleteId"):
        return data["athleteId"]
    for key in ("user", "profile", "account"):
        nested = data.get(key)
        if isinstance(nested, dict):
            for field in ("athleteId", "userId", "id"):
                if nested.get(field):
                    return nested[field]
    raise SystemExit(f"Cannot find athlete ID. Response keys: {list(data.keys())}\nFull response: {json.dumps(data, indent=2, default=str)[:800]}")


def fetch_pmc(token, athlete_id, start, end):
    path = f"/fitness/v1/athletes/{athlete_id}/reporting/performancedata/{start.isoformat()}/{end.isoformat()}"
    body = {
        "atlConstant": 7,
        "atlStart": 0,
        "ctlConstant": 42,
        "ctlStart": 0,
        "workoutTypes": [],
    }
    data = tp_post(token, path, body)
    if not data:
        return []

    raw = data if isinstance(data, list) else data.get("data", data.get("daily_data", []))
    if not isinstance(raw, list):
        return []

    days = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        d = (entry.get("date") or entry.get("workoutDay") or "")[:10]
        if not d:
            continue
        days.append({
            "date": d,
            "tss": entry.get("tssActual") or entry.get("tss"),
            "ctl": entry.get("ctl"),
            "atl": entry.get("atl"),
            "tsb": entry.get("tsb"),
        })
    return days


def fetch_workouts(token, athlete_id, start, end):
    path = f"/fitness/v6/athletes/{athlete_id}/workouts/{start.isoformat()}/{end.isoformat()}"
    data = tp_get(token, path)
    if not data or not isinstance(data, list):
        return []

    workouts = []
    for w in data:
        workouts.append({
            "tp_id": w.get("workoutId"),
            "date": (w.get("workoutDay") or "")[:10],
            "title": w.get("title", ""),
            "workout_type": w.get("workoutTypeValueId"),
            "duration_planned_s": w.get("totalTimePlanned"),
            "duration_actual_s": w.get("totalTime"),
            "distance_planned_m": round(w["distancePlanned"] * 1000, 1) if w.get("distancePlanned") else None,
            "distance_actual_m": round(w["distance"] * 1000, 1) if w.get("distance") else None,
            "tss_planned": w.get("tssPlanned"),
            "tss_actual": w.get("tssActual"),
            "if_planned": w.get("ifPlanned"),
            "if_actual": w.get("if"),
            "avg_power": w.get("powerAverage"),
            "norm_power": w.get("normalizedPowerActual"),
            "avg_hr": w.get("heartRateAverage"),
            "calories": w.get("caloriesSpent") or w.get("calories"),
            "elevation_m": w.get("elevationGain"),
            "completed": bool(w.get("completed")),
            "description": w.get("description", ""),
        })
    return workouts


def format_duration(seconds):
    if not seconds:
        return "?"
    h, rem = divmod(int(seconds), 3600)
    m, _ = divmod(rem, 60)
    return f"{h}h {m}m" if h else f"{m}m"


def pmc_markdown(day_data):
    d = day_data["date"]
    lines = [f"# TrainingPeaks PMC {d}"]
    if day_data.get("tss") is not None:
        lines.append(f"- TSS: {day_data['tss']:.0f}")
    if day_data.get("ctl") is not None:
        lines.append(f"- CTL (fitness): {day_data['ctl']:.1f}")
    if day_data.get("atl") is not None:
        lines.append(f"- ATL (fatigue): {day_data['atl']:.1f}")
    if day_data.get("tsb") is not None:
        lines.append(f"- TSB (form): {day_data['tsb']:.1f}")
    return "\n".join(lines) + "\n"


def workout_markdown(w):
    label = w["title"] or f"Workout {w.get('tp_id', '?')}"
    lines = [f"# {label} — {w['date']}"]
    if w.get("workout_type"):
        lines.append(f"- Type: {w['workout_type']}")
    if w.get("duration_actual_s"):
        lines.append(f"- Duration: {format_duration(w['duration_actual_s'])}")
    elif w.get("duration_planned_s"):
        lines.append(f"- Duration (planned): {format_duration(w['duration_planned_s'])}")
    if w.get("distance_actual_m"):
        lines.append(f"- Distance: {w['distance_actual_m'] / 1000:.1f} km")
    if w.get("tss_actual") is not None:
        lines.append(f"- TSS: {w['tss_actual']:.0f}")
    if w.get("if_actual") is not None:
        lines.append(f"- IF: {w['if_actual']:.2f}")
    if w.get("avg_power"):
        lines.append(f"- Avg power: {w['avg_power']:.0f} W")
    if w.get("norm_power"):
        lines.append(f"- Norm power: {w['norm_power']:.0f} W")
    if w.get("avg_hr"):
        lines.append(f"- Avg HR: {w['avg_hr']} bpm")
    if w.get("calories"):
        lines.append(f"- Calories: {w['calories']} kcal")
    if w.get("elevation_m"):
        lines.append(f"- Elevation: {w['elevation_m']:.0f} m")
    if w.get("completed"):
        lines.append("- Status: completed")
    return "\n".join(lines) + "\n"


def sink_files(pmc_data, workouts, out_dir):
    out = Path(out_dir)
    pmc_dir = out / "pmc"
    wkt_dir = out / "workouts"
    pmc_dir.mkdir(parents=True, exist_ok=True)
    wkt_dir.mkdir(parents=True, exist_ok=True)

    for d in pmc_data:
        (pmc_dir / f"{d['date']}.md").write_text(pmc_markdown(d), encoding="utf-8")

    for w in workouts:
        slug = f"{w['date']}-{w.get('tp_id', 'unknown')}"
        (wkt_dir / f"{slug}.md").write_text(workout_markdown(w), encoding="utf-8")

    store = {
        "synced_at": datetime.utcnow().isoformat() + "Z",
        "pmc": pmc_data,
        "workouts": workouts,
    }
    (out / "data.json").write_text(json.dumps(store, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {len(pmc_data)} PMC day(s) + {len(workouts)} workout(s) to {out}/")


def sink_supabase(pmc_data, workouts):
    url = os.environ.get("TP_INGEST_URL")
    secret = os.environ.get("TP_INGEST_SECRET")
    if not url:
        raise SystemExit("Set TP_INGEST_URL for supabase sink.")

    payload = {"pmc": pmc_data, "workouts": workouts}
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    r = requests.post(url, json=payload, headers=headers, timeout=30)
    if r.ok:
        print(f"POST {url} -> {r.status_code}")
    else:
        print(f"POST {url} -> {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Sync TrainingPeaks data")
    parser.add_argument("--store-cookie", metavar="COOKIE", help="Save Production_tpAuth cookie value")
    parser.add_argument("--days", type=int, default=14, help="Days to look back (default 14)")
    parser.add_argument("--sink", choices=["files", "supabase"], default="files", help="Where to send data")
    parser.add_argument("--out", default="./tp_data", help="Output directory for files sink")
    parser.add_argument("--dry-run", action="store_true", help="Print data without saving")
    args = parser.parse_args()

    if args.store_cookie:
        save_cookie(args.store_cookie)
        print("Cookie stored. You can now run without --store-cookie.")
        return

    cookie = load_cookie()
    print("Exchanging cookie for access token...")
    token = exchange_token(cookie)
    print("Authenticated.")

    athlete_id = get_athlete_id(token)
    print(f"Athlete ID: {athlete_id}")

    today = date.today()
    start = today - timedelta(days=args.days - 1)
    print(f"Fetching {args.days} day(s): {start} to {today}")

    print("  PMC data...", end=" ", flush=True)
    pmc_data = fetch_pmc(token, athlete_id, start, today)
    print(f"{len(pmc_data)} days")

    print("  Workouts...", end=" ", flush=True)
    workouts = fetch_workouts(token, athlete_id, start, today)
    print(f"{len(workouts)} workouts")

    if args.dry_run:
        print()
        for d in pmc_data:
            print(pmc_markdown(d))
        for w in workouts:
            print(workout_markdown(w))
        return

    if args.sink == "files":
        sink_files(pmc_data, workouts, args.out)
    elif args.sink == "supabase":
        sink_supabase(pmc_data, workouts)


if __name__ == "__main__":
    main()
