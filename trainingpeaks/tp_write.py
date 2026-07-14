#!/usr/bin/env python3
"""Write to TrainingPeaks: create, update, delete workouts and add comments.

Uses the same cookie-based auth as sync_tp.py.

Usage:
  # Create a workout
  python tp_write.py create --date 2026-07-20 --title "Endurance ride" \
    --type 2 --duration 5400 --description "Zone 2, 90min"

  # Update a workout
  python tp_write.py update --id 123456 --title "Updated title" --description "New plan"

  # Delete a workout
  python tp_write.py delete --id 123456

  # Add a comment
  python tp_write.py comment --id 123456 --text "Felt great today"

  # List workout types
  python tp_write.py types
"""

import argparse
import json
import sys

import requests

from sync_tp import (
    TP_API_BASE,
    exchange_token,
    get_athlete_id,
    load_cookie,
    tp_get,
)


def tp_put(token, path, body):
    r = requests.put(
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
        print(f"  PUT {path} -> {r.status_code}: {r.text[:300]}", file=sys.stderr)
        return None
    return r.json()


def tp_delete(token, path):
    r = requests.delete(
        f"{TP_API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        timeout=30,
    )
    if not r.ok:
        print(f"  DELETE {path} -> {r.status_code}: {r.text[:300]}", file=sys.stderr)
        return False
    return True


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
        print(f"  POST {path} -> {r.status_code}: {r.text[:300]}", file=sys.stderr)
        return None
    return r.json()


def fetch_workout_types(token):
    data = tp_get(token, "/fitness/v6/workouttypes")
    if not data:
        return []
    types = []
    for t in data if isinstance(data, list) else []:
        tid = t.get("id") or t.get("workoutTypeId")
        name = t.get("name") or t.get("description") or "?"
        subtypes = []
        for st in t.get("subTypes") or t.get("children") or []:
            stid = st.get("id") or st.get("workoutTypeId")
            stname = st.get("name") or st.get("description") or "?"
            subtypes.append({"id": stid, "name": stname})
        types.append({"id": tid, "name": name, "subtypes": subtypes})
    return types


def create_workout(token, athlete_id, date_str, title, workout_type=None,
                   duration_s=None, distance_km=None, tss=None, if_val=None,
                   description=""):
    body = {
        "athleteId": athlete_id,
        "workoutDay": f"{date_str}T00:00:00",
        "title": title,
        "description": description or "",
    }
    if workout_type is not None:
        body["workoutTypeValueId"] = workout_type
    if duration_s is not None:
        body["totalTimePlanned"] = duration_s
    if distance_km is not None:
        body["distancePlanned"] = distance_km
    if tss is not None:
        body["tssPlanned"] = tss
    if if_val is not None:
        body["ifPlanned"] = if_val

    path = f"/fitness/v6/athletes/{athlete_id}/workouts"
    result = tp_post(token, path, body)
    if result:
        wid = result.get("workoutId") or result.get("id")
        print(f"Created workout {wid}: {title} on {date_str}")
        return result
    return None


def update_workout(token, athlete_id, workout_id, **fields):
    path = f"/fitness/v6/athletes/{athlete_id}/workouts/{workout_id}"
    existing = tp_get(token, path)
    if not existing:
        print(f"Workout {workout_id} not found.", file=sys.stderr)
        return None

    field_map = {
        "title": "title",
        "description": "description",
        "duration_s": "totalTimePlanned",
        "distance_km": "distancePlanned",
        "tss": "tssPlanned",
        "if_val": "ifPlanned",
        "workout_type": "workoutTypeValueId",
        "date": "workoutDay",
    }
    for local_key, api_key in field_map.items():
        val = fields.get(local_key)
        if val is not None:
            if local_key == "date":
                val = f"{val}T00:00:00"
            existing[api_key] = val

    result = tp_put(token, path, existing)
    if result:
        print(f"Updated workout {workout_id}")
        return result
    return None


def delete_workout(token, athlete_id, workout_id):
    path = f"/fitness/v6/athletes/{athlete_id}/workouts/{workout_id}"
    if tp_delete(token, path):
        print(f"Deleted workout {workout_id}")
        return True
    return False


def add_comment(token, athlete_id, workout_id, text):
    path = f"/fitness/v2/athletes/{athlete_id}/workouts/{workout_id}/comments"
    result = tp_post(token, path, {"value": text})
    if result:
        print(f"Comment added to workout {workout_id}")
        return result
    return None


def authenticate():
    cookie = load_cookie()
    token = exchange_token(cookie)
    athlete_id = get_athlete_id(token)
    return token, athlete_id


def main():
    parser = argparse.ArgumentParser(description="Write to TrainingPeaks")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create", help="Create a workout")
    p_create.add_argument("--date", required=True, help="YYYY-MM-DD")
    p_create.add_argument("--title", required=True)
    p_create.add_argument("--type", type=int, dest="workout_type", help="Workout type ID")
    p_create.add_argument("--duration", type=int, help="Planned duration in seconds")
    p_create.add_argument("--distance", type=float, help="Planned distance in km")
    p_create.add_argument("--tss", type=float, help="Planned TSS")
    p_create.add_argument("--if", type=float, dest="if_val", help="Planned IF")
    p_create.add_argument("--description", default="", help="Workout description")

    p_update = sub.add_parser("update", help="Update a workout")
    p_update.add_argument("--id", required=True, dest="workout_id", help="Workout ID")
    p_update.add_argument("--title")
    p_update.add_argument("--description")
    p_update.add_argument("--date", help="Move to YYYY-MM-DD")
    p_update.add_argument("--type", type=int, dest="workout_type")
    p_update.add_argument("--duration", type=int, help="Seconds")
    p_update.add_argument("--distance", type=float, help="km")
    p_update.add_argument("--tss", type=float)
    p_update.add_argument("--if", type=float, dest="if_val")

    p_delete = sub.add_parser("delete", help="Delete a workout")
    p_delete.add_argument("--id", required=True, dest="workout_id")

    p_comment = sub.add_parser("comment", help="Add a comment to a workout")
    p_comment.add_argument("--id", required=True, dest="workout_id")
    p_comment.add_argument("--text", required=True)

    sub.add_parser("types", help="List workout types")

    args = parser.parse_args()

    token, athlete_id = authenticate()

    if args.command == "types":
        types = fetch_workout_types(token)
        for t in types:
            print(f"  {t['id']:>3}: {t['name']}")
            for st in t.get("subtypes", []):
                print(f"       └─ {st['id']:>3}: {st['name']}")
        return

    if args.command == "create":
        create_workout(token, athlete_id, args.date, args.title,
                       workout_type=args.workout_type, duration_s=args.duration,
                       distance_km=args.distance, tss=args.tss,
                       if_val=args.if_val, description=args.description)

    elif args.command == "update":
        update_workout(token, athlete_id, args.workout_id,
                       title=args.title, description=args.description,
                       date=args.date, workout_type=args.workout_type,
                       duration_s=args.duration, distance_km=args.distance,
                       tss=args.tss, if_val=args.if_val)

    elif args.command == "delete":
        delete_workout(token, athlete_id, args.workout_id)

    elif args.command == "comment":
        add_comment(token, athlete_id, args.workout_id, args.text)


if __name__ == "__main__":
    main()
