import os
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import aiofiles
from dotenv import load_dotenv

from models import Segment, JobStatus, UploadResponse, AnalyzeResponse, ExportResponse
from analyzer import analyze_video
from cutter import cut_video, cleanup_job

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/videoeditor")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="AI Video Editor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (MVP)
jobs: dict[str, JobStatus] = {}


def get_job_dir(job_id: str) -> str:
    path = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(path, exist_ok=True)
    return path


def get_job_or_404(job_id: str) -> JobStatus:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/upload", response_model=UploadResponse)
async def upload_video(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)

    safe_name = Path(file.filename or "video.mp4").name
    filepath = os.path.join(job_dir, safe_name)

    size = 0
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024

    async with aiofiles.open(filepath, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                await out.close()
                os.remove(filepath)
                raise HTTPException(status_code=413, detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit")
            await out.write(chunk)

    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        progress=0,
        message="Video nahráno, čeká na analýzu",
        segments=[],
    )

    # Store filepath in job (we use message field as carrier, real app would use DB)
    jobs[job_id].__dict__["_filepath"] = filepath

    logger.info(f"Uploaded {safe_name} ({size} bytes) as job {job_id}")
    return UploadResponse(job_id=job_id, filename=safe_name)


def _run_analysis(job_id: str, filepath: str):
    job = jobs.get(job_id)
    if not job:
        return

    def update_progress(pct: int, msg: str):
        j = jobs.get(job_id)
        if j:
            j.progress = pct
            j.message = msg

    try:
        job.status = "analyzing"
        job.progress = 5
        job.message = "Spouštím analýzu…"

        segments = analyze_video(job_id, filepath, progress_callback=update_progress)

        job.segments = segments
        job.status = "done"
        job.progress = 100
        job.message = f"Analýza dokončena — {len(segments)} segmentů"

    except Exception as e:
        logger.error(f"Analysis failed for job {job_id}: {e}", exc_info=True)
        job.status = "error"
        job.error = str(e)
        job.message = "Analýza selhala"


@app.post("/analyze/{job_id}", response_model=AnalyzeResponse)
async def analyze(job_id: str, background_tasks: BackgroundTasks):
    job = get_job_or_404(job_id)

    if job.status not in ("pending", "error"):
        raise HTTPException(status_code=400, detail=f"Job is in state '{job.status}'")

    filepath = job.__dict__.get("_filepath")
    if not filepath or not os.path.exists(filepath):
        # Try to find the file
        job_dir = get_job_dir(job_id)
        files = [f for f in os.listdir(job_dir) if not f.startswith(".")]
        if not files:
            raise HTTPException(status_code=404, detail="Video file not found")
        filepath = os.path.join(job_dir, files[0])

    background_tasks.add_task(_run_analysis, job_id, filepath)
    return AnalyzeResponse(job_id=job_id)


@app.get("/status/{job_id}", response_model=JobStatus)
async def get_status(job_id: str):
    return get_job_or_404(job_id)


@app.post("/export/{job_id}", response_model=ExportResponse)
async def export_video(job_id: str, background_tasks: BackgroundTasks, segments: Optional[list[Segment]] = None):
    job = get_job_or_404(job_id)

    if job.status != "done":
        raise HTTPException(status_code=400, detail="Analysis must complete before export")

    use_segments = segments if segments is not None else job.segments

    job_dir = get_job_dir(job_id)
    files = [f for f in os.listdir(job_dir) if f.endswith((".mp4", ".mov", ".avi")) and not f.startswith("output")]
    if not files:
        raise HTTPException(status_code=404, detail="Source video not found")

    input_path = os.path.join(job_dir, sorted(files)[0])
    output_path = os.path.join(job_dir, "output.mp4")

    job.status = "exporting"
    job.progress = 0
    job.message = "Exportuji video…"

    def _do_export():
        j = jobs.get(job_id)
        if not j:
            return
        try:
            j.progress = 10
            j.message = "Střihám segmenty…"
            cut_video(input_path, use_segments, output_path)
            cleanup_job(job_dir)
            j.status = "done"
            j.progress = 100
            j.message = "Export dokončen"
            j.download_url = f"/download/{job_id}"
        except Exception as e:
            logger.error(f"Export failed for job {job_id}: {e}", exc_info=True)
            j.status = "error"
            j.error = str(e)
            j.message = "Export selhal"

    background_tasks.add_task(_do_export)
    return ExportResponse(job_id=job_id)


@app.get("/download/{job_id}")
async def download_video(job_id: str):
    get_job_or_404(job_id)
    job_dir = get_job_dir(job_id)
    output_path = os.path.join(job_dir, "output.mp4")

    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output video not ready yet")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"edited_{job_id}.mp4",
    )


@app.get("/source/{job_id}")
async def source_video(job_id: str):
    """Serve the original uploaded video for in-browser preview."""
    get_job_or_404(job_id)
    job_dir = get_job_dir(job_id)
    files = [f for f in os.listdir(job_dir) if f.endswith((".mp4", ".mov", ".avi")) and not f.startswith("output")]
    if not files:
        raise HTTPException(status_code=404, detail="Source video not found")
    src_path = os.path.join(job_dir, sorted(files)[0])
    return FileResponse(src_path, media_type="video/mp4")


@app.get("/health")
async def health():
    return {"status": "ok"}
