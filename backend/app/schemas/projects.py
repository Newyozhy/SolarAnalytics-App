from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class FolderBase(BaseModel):
    id: str
    name: str

class FolderResponse(BaseModel):
    folders: List[FolderBase]

class ProcessProjectRequest(BaseModel):
    folder_id: str
    folder_name: str

class JobResponse(BaseModel):
    job_id: str
    status: str

class DailyGenerationRecord(BaseModel):
    date: str
    total_generation_kwh: float
    total_duration_min: float

class BatterySocRecord(BaseModel):
    save_time: str
    device_name: str
    value: float

class ProjectDataResponse(BaseModel):
    project_id: str
    project_name: str
    daily_generation: List[DailyGenerationRecord]
    battery_soc: List[BatterySocRecord]
    raw_data_summary: Dict[str, Any]


# ─── Sitios Globales ─────────────────────────────────────────

class ChildFolderInfo(BaseModel):
    id: str
    name: str
    cached: bool
    processed_at: Optional[str] = None

class SiteInfoResponse(BaseModel):
    folder_id: str
    folder_name: str
    site_type: str           # 'project' | 'site' | 'dc_load' | 'empty'
    children: List[ChildFolderInfo]
    merged_cached: bool
    merged_processed_at: Optional[str] = None
