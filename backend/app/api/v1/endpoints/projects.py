from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict
import uuid
import asyncio
import gc
from datetime import datetime, timezone

from app.schemas.projects import FolderResponse, ProcessProjectRequest, JobResponse
from app.services.drive_service import get_drive_service, find_folder_id, list_subfolders, download_project_data
from app.services.data_service import clean_solar_work_rec, get_daily_generation, clean_history_data
from app.services.supabase_service import (
    get_cached_project, save_project_result, list_cached_projects, get_cached_result_json
)

router = APIRouter()

# In-memory job store (reemplazar con Redis en producción)
JOBS_STORE: Dict[str, dict] = {}


# ─────────────────────────────────────────────────────────────
# EXPLORADOR DE DRIVE
# ─────────────────────────────────────────────────────────────

@router.get("/root-folders", response_model=FolderResponse)
def get_root_folders():
    """Lista las carpetas raíz dentro de 'Paneles Solares'."""
    try:
        service = get_drive_service()
        root_id = find_folder_id(service, "Paneles Solares")
        if not root_id:
            raise HTTPException(status_code=404, detail="Carpeta raíz 'Paneles Solares' no encontrada")
        folders = list_subfolders(service, root_id)
        return {"folders": folders}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{folder_id}/subfolders", response_model=FolderResponse)
def get_folder_contents(folder_id: str):
    """Lista subcarpetas de una carpeta específica."""
    try:
        service = get_drive_service()
        folders = list_subfolders(service, folder_id)
        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
# CACHÉ — Consultar estado de proyectos
# ─────────────────────────────────────────────────────────────

@router.get("/cache/status")
def get_cache_status(folder_ids: str):
    """
    Dado un string de folder_ids separados por coma,
    retorna cuáles ya están en el caché de Supabase.
    Ejemplo: /cache/status?folder_ids=abc123,def456
    """
    ids = [fid.strip() for fid in folder_ids.split(",") if fid.strip()]
    result = {}
    for fid in ids:
        record = get_cached_project(fid)
        if record:
            result[fid] = {
                "cached": True,
                "folder_name": record.get("folder_name"),
                "processed_at": record.get("processed_at"),
                "metadata": record.get("metadata", {}),
            }
        else:
            result[fid] = {"cached": False}
    return result


@router.get("/cache/recent")
def get_recent_projects(limit: int = 10):
    """Retorna los proyectos procesados más recientemente."""
    return {"projects": list_cached_projects(limit=limit)}


@router.get("/cache/{folder_id}")
def get_cached_result(folder_id: str):
    """
    Si el proyecto ya fue procesado, retorna el resultado cacheado directamente
    sin volver a descargar ni procesar.
    """
    record = get_cached_project(folder_id)
    if not record:
        raise HTTPException(status_code=404, detail="Este proyecto no ha sido procesado aún")
    return {
        "status": "cached",
        "cached_at": record.get("processed_at"),
        "result": record.get("result_json"),
    }


# ─────────────────────────────────────────────────────────────
# PROCESAMIENTO EN SEGUNDO PLANO
# ─────────────────────────────────────────────────────────────

def _process_project_task(job_id: str, folder_id: str, folder_name: str):
    """Tarea pesada que corre en un hilo separado."""
    try:
        # 1. Verificar caché primero (por si ya fue procesado mientras esperaba)
        cached = get_cached_result_json(folder_id)
        if cached:
            JOBS_STORE[job_id]["result"] = cached
            JOBS_STORE[job_id]["status"] = "completed"
            JOBS_STORE[job_id]["from_cache"] = True
            return

        # 2. Descargar de Drive
        JOBS_STORE[job_id]["status"] = "downloading"
        service = get_drive_service()
        dataframes = download_project_data(service, folder_id)

        # 3. Procesar datos
        JOBS_STORE[job_id]["status"] = "processing"
        daily_gen = []
        battery_soc = []

        if "solar_work_rec" in dataframes:
            df_solar_clean = clean_solar_work_rec(dataframes["solar_work_rec"])
            df_daily = get_daily_generation(df_solar_clean)
            daily_gen = df_daily.to_dict(orient="records")

        if "history_data" in dataframes:
            historicos = clean_history_data(dataframes["history_data"])
            if "battery_soc" in historicos:
                battery_soc = historicos["battery_soc"].to_dict(orient="records")

        result = {
            "project_id": folder_id,
            "project_name": folder_name,
            "daily_generation": daily_gen,
            "battery_soc": battery_soc,
            "raw_data_summary": {k: len(v) for k, v in dataframes.items()},
        }

        metadata = {
            "total_records": sum(len(v) for v in dataframes.values()),
            "csv_files": list(dataframes.keys()),
            "processing_date": datetime.now(timezone.utc).isoformat(),
        }

        # 4. Guardar en Supabase (caché persistente)
        JOBS_STORE[job_id]["status"] = "saving"
        save_project_result(folder_id, folder_name, result, metadata)

        # 5. Publicar resultado
        JOBS_STORE[job_id]["result"] = result
        JOBS_STORE[job_id]["status"] = "completed"
        JOBS_STORE[job_id]["from_cache"] = False

        # 6. Liberar RAM agresivamente
        del dataframes
        if "df_solar_clean" in locals(): del df_solar_clean
        if "df_daily" in locals(): del df_daily
        if "historicos" in locals(): del historicos
        gc.collect()

    except Exception as e:
        JOBS_STORE[job_id]["status"] = "failed"
        JOBS_STORE[job_id]["error"] = str(e)


@router.post("/process", response_model=JobResponse, status_code=202)
async def process_project(request: ProcessProjectRequest, background_tasks: BackgroundTasks):
    """
    Inicia el procesamiento. Si el proyecto ya está en caché, el
    background task lo detectará y retornará en segundos.
    """
    job_id = str(uuid.uuid4())
    JOBS_STORE[job_id] = {
        "status": "pending",
        "result": None,
        "error": None,
        "from_cache": False,
    }

    background_tasks.add_task(
        asyncio.to_thread,
        _process_project_task,
        job_id,
        request.folder_id,
        request.folder_name,
    )

    return {"job_id": job_id, "status": "pending"}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """Consulta el estado y resultado de un job de procesamiento."""
    if job_id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    job = JOBS_STORE[job_id]

    if job["status"] == "completed":
        return {
            "status": "completed",
            "from_cache": job.get("from_cache", False),
            "result": job["result"],
        }
    elif job["status"] == "failed":
        return {"status": "failed", "error": job["error"]}
    else:
        return {"status": job["status"]}
