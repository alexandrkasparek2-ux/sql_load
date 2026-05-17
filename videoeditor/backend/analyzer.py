import os
import json
import base64
import subprocess
import uuid
import logging
from pathlib import Path
from typing import Optional

from models import Segment

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/videoeditor")
FRAMES_PER_SECOND = float(os.getenv("FRAMES_PER_SECOND", "0.5"))
SILENCE_THRESHOLD_DB = float(os.getenv("SILENCE_THRESHOLD_DB", "-14"))
MIN_SILENCE_MS = int(os.getenv("MIN_SILENCE_MS", "1500"))


def _extract_frames(job_id: str, filepath: str) -> str:
    frames_dir = os.path.join(UPLOAD_DIR, job_id, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    cmd = [
        "ffmpeg", "-i", filepath,
        "-vf", f"fps={FRAMES_PER_SECOND}",
        "-q:v", "3",
        os.path.join(frames_dir, "frame_%04d.jpg"),
        "-y", "-loglevel", "error"
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return frames_dir


def _get_video_duration(filepath: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "json", filepath],
        capture_output=True, text=True, check=True
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def _detect_scenes(filepath: str) -> list[tuple[float, float]]:
    try:
        from scenedetect import detect, ContentDetector
        scenes = detect(filepath, ContentDetector(threshold=27.0))
        return [(s[0].get_seconds(), s[1].get_seconds()) for s in scenes]
    except Exception as e:
        logger.warning(f"Scene detection failed: {e}, falling back to fixed intervals")
        duration = _get_video_duration(filepath)
        interval = 4.0
        scenes = []
        t = 0.0
        while t < duration:
            end = min(t + interval, duration)
            scenes.append((t, end))
            t = end
        return scenes


def _detect_silence(filepath: str) -> list[tuple[float, float]]:
    """Returns list of (start, end) tuples for silent sections."""
    try:
        from pydub import AudioSegment
        from pydub.silence import detect_silence

        audio_path = filepath.rsplit(".", 1)[0] + "_audio.wav"
        subprocess.run(
            ["ffmpeg", "-i", filepath, "-vn", "-acodec", "pcm_s16le",
             "-ar", "44100", "-ac", "1", audio_path, "-y", "-loglevel", "error"],
            check=True, capture_output=True
        )

        if not os.path.exists(audio_path):
            return []

        audio = AudioSegment.from_wav(audio_path)
        if len(audio) == 0:
            return []

        silence_thresh = audio.dBFS + SILENCE_THRESHOLD_DB
        silent_ranges = detect_silence(
            audio,
            min_silence_len=MIN_SILENCE_MS,
            silence_thresh=silence_thresh
        )

        try:
            os.remove(audio_path)
        except OSError:
            pass

        return [(start / 1000.0, end / 1000.0) for start, end in silent_ranges]
    except Exception as e:
        logger.warning(f"Audio analysis failed: {e}")
        return []


def _is_silent(start: float, end: float, silent_ranges: list[tuple[float, float]]) -> bool:
    """Check if a segment overlaps significantly with silent ranges."""
    seg_duration = end - start
    if seg_duration <= 0:
        return False

    overlap = 0.0
    for s_start, s_end in silent_ranges:
        overlap_start = max(start, s_start)
        overlap_end = min(end, s_end)
        if overlap_end > overlap_start:
            overlap += overlap_end - overlap_start

    return (overlap / seg_duration) > 0.6


def _get_frame_for_time(frames_dir: str, timestamp: float) -> Optional[str]:
    """Get frame file closest to given timestamp."""
    frame_index = max(1, round(timestamp * FRAMES_PER_SECOND) + 1)
    frame_path = os.path.join(frames_dir, f"frame_{frame_index:04d}.jpg")

    if os.path.exists(frame_path):
        return frame_path

    # Find nearest available frame
    try:
        frames = sorted(
            f for f in os.listdir(frames_dir) if f.endswith(".jpg")
        )
        if frames:
            return os.path.join(frames_dir, frames[min(frame_index - 1, len(frames) - 1)])
    except OSError:
        pass

    return None


def _score_frame_with_ai(frame_path: str) -> dict:
    """Use Claude Vision API to score a frame."""
    try:
        import anthropic

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")

        with open(frame_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=256,
            system=(
                "You are a professional video editor. Analyze this video frame and return ONLY valid JSON, no other text.\n\n"
                "Return this exact structure:\n"
                '{\n  "score": <integer 0-100>,\n  "action": "<keep or cut>",\n'
                '  "reason": "<max 8 words in Czech>",\n'
                '  "issues": [<list of strings from: blur, shake, dark, empty, overexposed>]\n}\n\n'
                "Scoring rules:\n"
                "- 80-100: sharp, well-lit, interesting content → keep\n"
                "- 50-79: acceptable, minor issues → keep\n"
                "- 0-49: blurry / dark / shaky / empty → cut"
            ),
            messages=[{
                "role": "user",
                "content": [{
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_data,
                    },
                }]
            }]
        )

        text = message.content[0].text.strip()
        # Extract JSON if wrapped in markdown code block
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)

    except Exception as e:
        logger.warning(f"AI scoring failed for {frame_path}: {e}")
        return {
            "score": 60,
            "action": "keep",
            "reason": "AI analýza nedostupná",
            "issues": []
        }


def analyze_video(job_id: str, filepath: str, progress_callback=None) -> list[Segment]:
    """Main analysis pipeline."""

    if progress_callback:
        progress_callback(5, "Extrahuji snímky…")

    frames_dir = _extract_frames(job_id, filepath)

    if progress_callback:
        progress_callback(20, "Detekcuji scény…")

    scenes = _detect_scenes(filepath)

    if progress_callback:
        progress_callback(35, "Analyzuji audio…")

    silent_ranges = _detect_silence(filepath)

    if progress_callback:
        progress_callback(50, "Skóruji záběry pomocí AI…")

    segments = []
    total = len(scenes)

    for i, (start, end) in enumerate(scenes):
        seg_id = str(uuid.uuid4())[:8]
        duration = end - start
        mid = (start + end) / 2.0

        frame_path = _get_frame_for_time(frames_dir, mid)
        if frame_path:
            ai_result = _score_frame_with_ai(frame_path)
        else:
            ai_result = {"score": 60, "action": "keep", "reason": "Snímek nedostupný", "issues": []}

        score = ai_result.get("score", 60)
        action = ai_result.get("action", "keep")
        reason = ai_result.get("reason", "")
        issues = ai_result.get("issues", [])

        is_silent = _is_silent(start, end, silent_ranges)
        if is_silent:
            issues = list(set(issues + ["silence"]))
            if score < 70:
                action = "cut"
                reason = "Ticho a nízké skóre"

        segments.append(Segment(
            id=seg_id,
            start=round(start, 3),
            end=round(end, 3),
            duration=round(duration, 3),
            action=action,
            reason=reason,
            score=score,
            issues=issues,
        ))

        if progress_callback:
            pct = 50 + int(45 * (i + 1) / max(total, 1))
            progress_callback(pct, f"Analyzuji záběr {i+1}/{total}…")

    segments.sort(key=lambda s: s.start)

    if progress_callback:
        progress_callback(99, "Analýza dokončena")

    return segments
