from pydantic import BaseModel
from typing import Optional


class Segment(BaseModel):
    id: str
    start: float
    end: float
    duration: float
    action: str  # "keep" | "cut"
    reason: str
    score: int   # 0-100
    issues: list[str]  # ["blur", "shake", "silence", "dark"]


class JobStatus(BaseModel):
    job_id: str
    status: str  # "pending" | "uploading" | "analyzing" | "done" | "error"
    progress: int  # 0-100
    message: str
    segments: list[Segment] = []
    error: Optional[str] = None
    download_url: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    filename: str


class AnalyzeResponse(BaseModel):
    job_id: str


class ExportResponse(BaseModel):
    job_id: str
    download_url: Optional[str] = None
