import os
import subprocess
import shutil
import logging
from pathlib import Path

from models import Segment

logger = logging.getLogger(__name__)


def cut_video(input_path: str, segments: list[Segment], output_path: str) -> str:
    """Cut and concatenate video segments marked as 'keep'."""
    keep_segments = [s for s in segments if s.action == "keep"]

    if not keep_segments:
        logger.warning("No keep segments, copying original video")
        shutil.copy2(input_path, output_path)
        return output_path

    work_dir = os.path.dirname(output_path)
    parts = []

    for i, seg in enumerate(keep_segments):
        part_path = os.path.join(work_dir, f"part_{i:04d}.mp4")
        cmd = [
            "ffmpeg",
            "-ss", str(seg.start),
            "-to", str(seg.end),
            "-i", input_path,
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            part_path,
            "-y", "-loglevel", "error"
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            if os.path.exists(part_path) and os.path.getsize(part_path) > 0:
                parts.append(part_path)
            else:
                logger.warning(f"Part {i} is empty, skipping")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to cut segment {i}: {e.stderr.decode()}")

    if not parts:
        logger.warning("No valid parts, copying original")
        shutil.copy2(input_path, output_path)
        return output_path

    if len(parts) == 1:
        shutil.move(parts[0], output_path)
        return output_path

    concat_list_path = os.path.join(work_dir, "concat_list.txt")
    with open(concat_list_path, "w") as f:
        for part in parts:
            f.write(f"file '{part}'\n")

    concat_cmd = [
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_path,
        "-c", "copy",
        output_path,
        "-y", "-loglevel", "error"
    ]
    subprocess.run(concat_cmd, check=True, capture_output=True)

    for part in parts:
        try:
            os.remove(part)
        except OSError:
            pass
    try:
        os.remove(concat_list_path)
    except OSError:
        pass

    return output_path


def cleanup_job(job_dir: str):
    """Remove temporary files for a job, keeping only the output video."""
    frames_dir = os.path.join(job_dir, "frames")
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir, ignore_errors=True)

    for f in os.listdir(job_dir):
        if f.startswith("part_") or f == "concat_list.txt":
            try:
                os.remove(os.path.join(job_dir, f))
            except OSError:
                pass
