from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict
import uuid
import asyncio

from app.schemas.projects import FolderResponse, ProcessProjectRequest, JobResponse, ProjectDataResponse
from app.services.drive_service import get_drive_service, find_folder_id, list_subfolders, download_project_data
from app.services.data_service import clean_solar_work_rec, get_daily_generation, clean_history_data
import gc

router = APIRouter()

# Simple in-memory dict to store job status and results (In production, use Redis or DB)
JOBS_STORE: Dict[str, dict] = {}

@router.get("/root-folders", response_model=FolderResponse)
def get_root_folders():
    """Obtiene las carpetas dentro de 'Paneles Solares'."""
    try:
        service = get_drive_service()
        root_id = find_folder_id(service, "Paneles Solares")
        if not root_id:
            raise HTTPException(status_code=404, detail="Carpeta raíz no encontrada")
            
        folders = list_subfolders(service, root_id)
        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{folder_id}/subfolders", response_model=FolderResponse)
def get_folder_contents(folder_id: str):
    """Obtiene las subcarpetas de una carpeta específica."""
    try:
        service = get_drive_service()
        folders = list_subfolders(service, folder_id)
        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _process_project_task(job_id: str, folder_id: str, folder_name: str):
    """Tarea sincrónica pesada que se ejecutará en un hilo separado."""
    try:
        JOBS_STORE[job_id]["status"] = "downloading"
        service = get_drive_service()
        
        # 1. Descargar CSVs (Pesado I/O y RAM)
        dataframes = download_project_data(service, folder_id)
        
        JOBS_STORE[job_id]["status"] = "processing"
        
        # 2. Procesar Datos (Pesado CPU y RAM)
        daily_gen = []
        battery_soc = []
        
        if 'solar_work_rec' in dataframes:
            df_solar_clean = clean_solar_work_rec(dataframes['solar_work_rec'])
            df_daily = get_daily_generation(df_solar_clean)
            daily_gen = df_daily.to_dict(orient='records')
            
        if 'history_data' in dataframes:
            historicos = clean_history_data(dataframes['history_data'])
            if 'battery_soc' in historicos:
                battery_soc = historicos['battery_soc'].to_dict(orient='records')
                
        # 3. Guardar resultados
        JOBS_STORE[job_id]["result"] = {
            "project_id": folder_id,
            "project_name": folder_name,
            "daily_generation": daily_gen,
            "battery_soc": battery_soc,
            "raw_data_summary": {k: len(v) for k, v in dataframes.items()}
        }
        JOBS_STORE[job_id]["status"] = "completed"
        
        # 4. Limpieza agresiva de RAM
        del dataframes
        if 'df_solar_clean' in locals(): del df_solar_clean
        if 'df_daily' in locals(): del df_daily
        if 'historicos' in locals(): del historicos
        gc.collect()
        
    except Exception as e:
        JOBS_STORE[job_id]["status"] = "failed"
        JOBS_STORE[job_id]["error"] = str(e)

@router.post("/process", response_model=JobResponse, status_code=202)
async def process_project(request: ProcessProjectRequest, background_tasks: BackgroundTasks):
    """
    Inicia el procesamiento pesado de un proyecto en segundo plano.
    Retorna un Job ID para consultar el estado (Polling).
    """
    job_id = str(uuid.uuid4())
    JOBS_STORE[job_id] = {"status": "pending", "result": None, "error": None}
    
    # Enviar a un hilo separado para no bloquear el event loop asíncrono
    background_tasks.add_task(
        asyncio.to_thread, 
        _process_project_task, 
        job_id, 
        request.folder_id, 
        request.folder_name
    )
    
    return {"job_id": job_id, "status": "pending"}

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """Consulta el estado y resultado de una tarea de procesamiento."""
    if job_id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = JOBS_STORE[job_id]
    
    if job["status"] == "completed":
        # Podemos retornar el resultado y luego eliminarlo para liberar memoria
        result = job["result"]
        # del JOBS_STORE[job_id] # Depende si queremos que esté disponible más de una vez
        return {"status": "completed", "result": result}
        
    elif job["status"] == "failed":
        return {"status": "failed", "error": job["error"]}
        
    else:
        return {"status": job["status"]}
