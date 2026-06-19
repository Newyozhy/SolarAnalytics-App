from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict
import uuid
import asyncio
import gc
import json
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from app.schemas.projects import FolderResponse, ProcessProjectRequest, JobResponse
from app.services.drive_service import (
    get_drive_service, find_folder_id, list_subfolders, download_project_data,
    get_csv_files_in_project, download_csv_to_dataframe,
    get_excel_files_in_project, download_excel_to_dataframe
)
from app.services.data_service import (
    clean_solar_work_rec, get_daily_generation, clean_history_data,
    clean_dc_load_consumption
)
from app.services.supabase_service import (
    get_cached_project, save_project_result, list_cached_projects,
    get_cached_result_json, delete_cached_project
)
from app.core.config import settings

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
        root_config = settings.GOOGLE_DRIVE_ROOT_FOLDER
        
        # 1. Intentar usar como ID directo (si tiene formato de ID de Drive)
        # Los IDs suelen tener más de 20 caracteres y no espacios
        if len(root_config) > 20 and " " not in root_config:
            root_id = root_config
        else:
            # 2. Si no es un ID, buscar por nombre
            root_id = find_folder_id(service, root_config)
            
        if not root_id:
            raise HTTPException(status_code=404, detail=f"Carpeta raíz '{root_config}' no encontrada")
            
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

# ─────────────────────────────────────────────────────────────
# HELPERS: normalización de nombres para fuzzy matching
# ─────────────────────────────────────────────────────────────
import unicodedata
import re

def _normalize_name(name: str) -> str:
    """Normaliza cadena a minúsculas sin acentos, sin sufijos comunes y sin espacios extras."""
    name = unicodedata.normalize('NFKD', name)
    name = ''.join(c for c in name if not unicodedata.combining(c))
    name = name.lower()
    # Eliminar sufijos comunes irrelevantes
    for suffix in ['updated', 'project', 'proyecto', 'sitio', 'site']:
        name = re.sub(rf'\b{suffix}\b', '', name)
    return re.sub(r'\s+', ' ', name).strip()

def _extract_location_key(location: str) -> str:
    """Extrae el nombre clave del campo Location del Excel (último segmento tras '/')."""
    parts = location.split('/')
    # Último segmento, y si tiene un punto, tomar solo la parte después del punto
    last = parts[-1].strip() if parts else location
    if '.' in last:
        last = last.split('.', 1)[-1].strip()
    return last

def _fuzzy_match_projects(location: str, cached_projects: list) -> str | None:
    """
    Intenta encontrar el folder_id del proyecto en Supabase cuyo nombre
    normalizado coincide con el location extraído del Excel.
    Ignora proyectos provisionales (dc_load_only).
    Retorna el folder_id si hay coincidencia única, None si no.
    """
    location_key = _normalize_name(_extract_location_key(location))
    matches = []
    for proj in cached_projects:
        folder_id = proj.get('folder_id', '')
        if folder_id.startswith('dc_load_'):
            continue
        meta = proj.get('metadata') or {}
        if meta.get('project_type') == 'dc_load_only':
            continue

        proj_name_norm = _normalize_name(proj.get('folder_name', ''))
        if location_key in proj_name_norm or proj_name_norm in location_key:
            matches.append(proj)
            
    if len(matches) == 1:
        return matches[0].get('folder_id')
    return None

def _find_candidate_projects(location: str, cached_projects: list) -> list:
    """Retorna todos los proyectos solares que coinciden parcialmente con la ubicación."""
    location_key = _normalize_name(_extract_location_key(location))
    candidates = []
    for proj in cached_projects:
        folder_id = proj.get('folder_id', '')
        if folder_id.startswith('dc_load_'):
            continue
        meta = proj.get('metadata') or {}
        if meta.get('project_type') == 'dc_load_only':
            continue

        proj_name_norm = _normalize_name(proj.get('folder_name', ''))
        if location_key in proj_name_norm or proj_name_norm in location_key:
            candidates.append(proj)
    return candidates

def get_project_suffix_num(name: str) -> int:
    """Extrae el número de sufijo de un proyecto (ej. Esmeralda 2 -> 2). Default = 1."""
    norm = _normalize_name(name)
    match = re.search(r'\b(\d+)\b$', norm)
    if match:
        return int(match.group(1))
    return 1

def get_site_suffix_num(site_name: str) -> int:
    """Extrae un número identificador del sitio (ej. SFV2 -> 2, PW 1.245 -> 1). Default = 1."""
    norm = site_name.lower()
    match = re.search(r'sfv(\d+)', norm)
    if match:
        return int(match.group(1))
    match = re.search(r'\b(\d+)\.', norm)
    if match:
        return int(match.group(1))
    match = re.search(r'\b([1-9])\b', norm)
    if match:
        return int(match.group(1))
    return 1


# ─────────────────────────────────────────────────────────────
# TAREA: Ingesta de archivos DC Load Consumption (Excel)
# ─────────────────────────────────────────────────────────────

def _process_dc_load_task(job_id: str, folder_id: str, folder_name: str):
    """
    Procesa una carpeta de Google Drive que contiene archivos Excel de consumo DC.
    - Combina todos los Excel de la carpeta.
    - Intenta asociar automáticamente cada Location con un proyecto solar existente.
    - Si coincide, enriquece el result_json de ese proyecto con dc_load_consumption.
    - Si no coincide, crea un proyecto provisional de tipo 'dc_load_only'.
    - Si coincide con múltiples proyectos solares candidatos, divide por Site.
    """
    try:
        JOBS_STORE[job_id]["status"] = "downloading"
        service = get_drive_service()
        excel_files = get_excel_files_in_project(service, folder_id)

        if not excel_files:
            JOBS_STORE[job_id]["status"] = "failed"
            JOBS_STORE[job_id]["error"] = "No se encontraron archivos 'DC Load Consumption' en la carpeta."
            return

        JOBS_STORE[job_id]["status"] = "processing"

        # Descargar y combinar todos los Excel en un solo DataFrame
        frames = []
        for file_info in excel_files:
            df_raw = download_excel_to_dataframe(service, file_info['id'])
            df_clean = clean_dc_load_consumption(df_raw)
            if not df_clean.empty:
                frames.append(df_clean)
            del df_raw; gc.collect()

        if not frames:
            JOBS_STORE[job_id]["status"] = "failed"
            JOBS_STORE[job_id]["error"] = "Los archivos Excel no contenían datos válidos."
            return

        df_all = pd.concat(frames, ignore_index=True)
        df_all['Date'] = df_all['Date'].astype(str)
        del frames; gc.collect()

        # Agrupar consumo diario por Location + Date + Site + Supply Mode
        numeric_agg = {}
        for col in ['Avg Total Power(kW)', 'Max Total Power(kW)', 'Min Total Power(kW)',
                    'Avg Total Current(A)', 'Max Total Current(A)', 'Min Total Current(A)',
                    'consumption_kwh']:
            if col in df_all.columns:
                numeric_agg[col] = 'mean'

        df_grouped = (
            df_all
            .groupby(['Date', 'Location', 'Site', 'Supply Mode'])
            .agg(numeric_agg)
            .reset_index()
        )

        # Listar proyectos cacheados para el fuzzy matching
        cached_projects = list_cached_projects(limit=200)

        # Agrupar por Location para hacer la asociación
        location_groups = df_grouped.groupby('Location')
        matched_count = 0
        provisional_count = 0
        association_map = {}  # {location: status_string}

        for location, loc_df in location_groups:
            # Crear y guardar SIEMPRE el proyecto provisional (dc_load_only) para que aparezca en la lista manual
            prov_folder_id = f"dc_load_{folder_id}_{_normalize_name(_extract_location_key(location)).replace(' ', '_')}"
            prov_name = f"[DC Load] {_extract_location_key(location)}"
            dc_records = json.loads(
                loc_df.to_json(orient='records', date_format='iso')
            )
            prov_result = {
                "project_id": prov_folder_id,
                "project_name": prov_name,
                "project_type": "dc_load_only",
                "dc_load_consumption": dc_records,
                "dc_load_locations": [location],
                "daily_generation": [],
                "battery_soc": [],
                "raw_data": {},
            }
            save_project_result(
                prov_folder_id,
                prov_name,
                prov_result,
                {
                    "project_type": "dc_load_only",
                    "source_folder_id": folder_id,
                    "dc_load_folder": folder_id,
                    "processing_date": datetime.now(timezone.utc).isoformat(),
                }
            )
            provisional_count += 1

            candidates = _find_candidate_projects(location, cached_projects)

            if len(candidates) == 1:
                # Caso 2: Coincidencia única
                matched_proj = candidates[0]
                matched_folder_id = matched_proj.get('folder_id')
                existing = get_cached_result_json(matched_folder_id) or {}
                existing['dc_load_consumption'] = dc_records
                existing['dc_load_locations'] = existing.get('dc_load_locations', [])
                if location not in existing['dc_load_locations']:
                    existing['dc_load_locations'].append(location)

                save_project_result(
                    matched_folder_id,
                    matched_proj.get('folder_name', matched_folder_id),
                    existing,
                    {"dc_load_linked": True, "dc_load_folder": folder_id}
                )
                association_map[location] = f"{prov_folder_id} -> Auto-asociado a {matched_folder_id}"
                matched_count += 1

            elif len(candidates) > 1:
                # Caso 3: Múltiples candidatos -> Dividir registros por Site y asociar por número
                site_groups = loc_df.groupby('Site')
                matched_sites_list = []

                for site_name, site_df in site_groups:
                    site_num = get_site_suffix_num(site_name)
                    matched_proj = None
                    for c in candidates:
                        proj_num = get_project_suffix_num(c.get('folder_name', ''))
                        if proj_num == site_num:
                            matched_proj = c
                            break

                    if matched_proj:
                        matched_folder_id = matched_proj.get('folder_id')
                        existing = get_cached_result_json(matched_folder_id) or {}
                        site_dc_records = json.loads(
                            site_df.to_json(orient='records', date_format='iso')
                        )
                        existing['dc_load_consumption'] = site_dc_records
                        existing['dc_load_locations'] = existing.get('dc_load_locations', [])
                        if location not in existing['dc_load_locations']:
                            existing['dc_load_locations'].append(location)

                        save_project_result(
                            matched_folder_id,
                            matched_proj.get('folder_name', matched_folder_id),
                            existing,
                            {"dc_load_linked": True, "dc_load_folder": folder_id, "dc_load_site": site_name}
                        )
                        matched_sites_list.append(f"{site_name} -> {matched_proj.get('folder_name')}")
                        matched_count += 1

                association_map[location] = f"{prov_folder_id} -> Split: {', '.join(matched_sites_list)}"
            else:
                association_map[location] = prov_folder_id


        result = {
            "project_id": folder_id,
            "project_name": folder_name,
            "project_type": "dc_load_batch",
            "total_records": len(df_all),
            "locations_processed": list(location_groups.groups.keys()),
            "matched_to_existing": matched_count,
            "created_provisional": provisional_count,
            "association_map": association_map,
        }
        JOBS_STORE[job_id]["result"] = result
        JOBS_STORE[job_id]["status"] = "completed"
        JOBS_STORE[job_id]["from_cache"] = False
        gc.collect()

    except Exception as e:
        import traceback
        JOBS_STORE[job_id]["status"] = "failed"
        JOBS_STORE[job_id]["error"] = str(e)
        JOBS_STORE[job_id]["traceback"] = traceback.format_exc()


# ─────────────────────────────────────────────────────────────
# TAREA: Procesamiento tradicional de proyecto solar (CSVs)
# ─────────────────────────────────────────────────────────────

def _process_project_task(job_id: str, folder_id: str, folder_name: str):
    """Tarea pesada que corre en un hilo separado con bajo uso de memoria."""
    try:
        from app.api.v1.endpoints.analysis import invalidate_project_cache
        invalidate_project_cache(folder_id)

        # 1. Verificar caché primero
        cached = get_cached_result_json(folder_id)
        if cached:
            JOBS_STORE[job_id]["result"] = cached
            JOBS_STORE[job_id]["status"] = "completed"
            JOBS_STORE[job_id]["from_cache"] = True
            return

        # 2. Obtener lista de archivos
        JOBS_STORE[job_id]["status"] = "downloading"
        service = get_drive_service()

        # ── Detección automática: ¿es una carpeta de DC Load Excel? ──
        excel_files = get_excel_files_in_project(service, folder_id)
        if excel_files and not get_csv_files_in_project(service, folder_id):
            # Redirigir al pipeline de consumo DC
            _process_dc_load_task(job_id, folder_id, folder_name)
            return

        csv_files = get_csv_files_in_project(service, folder_id)

        # ── Si hay datos de generación solar, buscar si existe proyecto dc_load_only
        # provisional para este sitio y fusionarlo automáticamente.
        cached_projects = list_cached_projects(limit=200)
        prov_folder_id = next(
            (p['folder_id'] for p in cached_projects
             if p.get('metadata', {}).get('source_folder_id') != folder_id
             and p.get('metadata', {}).get('project_type') == 'dc_load_only'
             and _normalize_name(folder_name) in _normalize_name(p.get('folder_name', ''))),
            None
        )

        # 3. Procesar datos CSV secuencialmente
        JOBS_STORE[job_id]["status"] = "processing"
        daily_gen = []
        battery_soc = []
        raw_summary = {}
        raw_data_cache = {}

        for file_info in csv_files:
            name_key = file_info['name'].replace('.csv', '')

            if name_key == "solar_work_rec":
                df = download_csv_to_dataframe(service, file_info['id'])
                raw_summary[name_key] = len(df)
                df_clean = clean_solar_work_rec(df)

                from app.services.analysis_service import _detect_utc8_solar, _apply_tz_correction, _UTC8_OFFSET_H
                if not df_clean.empty and _detect_utc8_solar(df_clean):
                    df_clean['start_time'] = _apply_tz_correction(df_clean['start_time'], _UTC8_OFFSET_H)
                    if 'end_time' in df_clean.columns:
                        df_clean['end_time'] = _apply_tz_correction(df_clean['end_time'], _UTC8_OFFSET_H)
                    if 'date' in df_clean.columns:
                        df_clean['date'] = df_clean['start_time'].dt.date

                df_daily = get_daily_generation(df_clean)
                daily_gen = json.loads(df_daily.to_json(orient="records", date_format="iso"))
                raw_data_cache["solar"] = json.loads(df_clean.to_json(orient="records", date_format="iso"))
                del df; del df_clean; del df_daily; gc.collect()

            elif name_key == "history_data":
                df = download_csv_to_dataframe(service, file_info['id'])
                from app.services.analysis_service import _rename_columns, _detect_utc8_history, _apply_tz_correction, _UTC8_OFFSET_H
                df = _rename_columns(df)
                raw_summary[name_key] = len(df)
                historicos = clean_history_data(df)

                if "battery_soc" in historicos:
                    battery_soc = json.loads(historicos["battery_soc"].to_json(orient="records", date_format="iso"))

                if df is not None and not df.empty and 'signal_name' in df.columns:
                    mask = df['signal_name'].str.contains(
                        'SOC|SOH|Voltage|Load Power|Source Power|Total Generation|Temperature',
                        case=False, na=False
                    )
                    df_filtered = df[mask].copy()
                else:
                    df_filtered = df.copy()

                df_filtered = df_filtered.reset_index(drop=True)
                df_filtered['save_time'] = pd.to_datetime(df_filtered['save_time'], errors='coerce')
                df_filtered['value'] = pd.to_numeric(df_filtered['value'], errors='coerce')
                df_filtered = df_filtered.dropna(subset=['save_time', 'value']).reset_index(drop=True)

                if _detect_utc8_history(df_filtered):
                    df_filtered['save_time'] = _apply_tz_correction(df_filtered['save_time'], _UTC8_OFFSET_H)

                df_filtered = df_filtered.groupby(['device_name', 'signal_name']).resample('4h', on='save_time')['value'].mean().reset_index()

                MAX_ROWS_PER_SIGNAL = 1000
                df_filtered = (
                    df_filtered
                    .groupby(['device_name', 'signal_name'], group_keys=False)
                    .apply(lambda g: g.tail(MAX_ROWS_PER_SIGNAL))
                    .reset_index(drop=True)
                )
                raw_data_cache["history"] = json.loads(df_filtered.to_json(orient="records", date_format="iso"))
                del df; del df_filtered; del historicos; gc.collect()

            elif name_key == "history_alarm":
                df = download_csv_to_dataframe(service, file_info['id'])
                from app.services.analysis_service import _rename_columns
                df = _rename_columns(df)
                raw_summary[name_key] = len(df)
                raw_data_cache["alarms"] = json.loads(df.to_json(orient="records", date_format="iso"))
                del df; gc.collect()
            else:
                raw_summary[name_key] = 0

        result = {
            "project_id": folder_id,
            "project_name": folder_name,
            "daily_generation": daily_gen,
            "battery_soc": battery_soc,
            "raw_data_summary": raw_summary,
            "raw_data": raw_data_cache,
        }

        # ── Fusión automática con proyecto provisional DC Load ──
        if prov_folder_id:
            prov_data = get_cached_result_json(prov_folder_id)
            if prov_data and 'dc_load_consumption' in prov_data:
                result['dc_load_consumption'] = prov_data['dc_load_consumption']
                result['dc_load_locations'] = prov_data.get('dc_load_locations', [])
                # NO eliminar el proyecto provisional para que siga visible en la lista
                # delete_cached_project(prov_folder_id)

        metadata = {
            "total_records": sum(raw_summary.values()),
            "csv_files": [f['name'] for f in csv_files],
            "processing_date": datetime.now(timezone.utc).isoformat(),
        }

        JOBS_STORE[job_id]["status"] = "saving"
        saved = save_project_result(folder_id, folder_name, result, metadata)
        if not saved:
            JOBS_STORE[job_id]["save_warning"] = (
                "El resultado NO se guardó en el caché Supabase. "
                "Revisa SUPABASE_SERVICE_KEY y los logs del servidor."
            )

        JOBS_STORE[job_id]["result"] = result
        JOBS_STORE[job_id]["status"] = "completed"
        JOBS_STORE[job_id]["from_cache"] = False
        gc.collect()

    except Exception as e:
        import traceback
        JOBS_STORE[job_id]["status"] = "failed"
        JOBS_STORE[job_id]["error"] = str(e)
        JOBS_STORE[job_id]["traceback"] = traceback.format_exc()


@router.post("/process", response_model=JobResponse, status_code=202)
async def process_project(request: ProcessProjectRequest, background_tasks: BackgroundTasks):
    """
    Inicia el procesamiento. Detecta automáticamente si la carpeta contiene
    archivos de consumo DC (Excel) o datos solares tradicionales (CSV).
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


# ─────────────────────────────────────────────────────────────
# ASOCIACIÓN MANUAL: permite vincular consumo DC a un proyecto
# ─────────────────────────────────────────────────────────────

@router.post("/{project_id}/link-consumption")
def link_dc_consumption(project_id: str, body: dict):
    """
    Vincula manualmente los datos de consumo DC de un proyecto provisional
    (dc_load_only) a un proyecto solar existente.

    Body JSON:
    {
      "dc_load_project_id": "dc_load_...",
      "location_filter": "All/R5/VCH.La Tigrera"  // opcional, para filtrar ubicación
    }
    """
    dc_project_id = body.get("dc_load_project_id")
    location_filter = body.get("location_filter")

    if not dc_project_id:
        raise HTTPException(status_code=400, detail="dc_load_project_id es requerido")

    dc_data = get_cached_result_json(dc_project_id)
    if not dc_data:
        raise HTTPException(status_code=404, detail=f"Proyecto DC Load '{dc_project_id}' no encontrado en caché")

    solar_data = get_cached_result_json(project_id)
    if solar_data is None:
        raise HTTPException(status_code=404, detail=f"Proyecto solar '{project_id}' no encontrado en caché")

    # Filtrar registros de consumo por location si se especifica
    dc_records = dc_data.get('dc_load_consumption', [])
    if location_filter:
        dc_records = [r for r in dc_records if r.get('Location') == location_filter]

    if not dc_records:
        raise HTTPException(status_code=404, detail="No se encontraron registros de consumo para la ubicación especificada")

    # Fusionar en el proyecto solar
    solar_data['dc_load_consumption'] = dc_records
    solar_data['dc_load_locations'] = solar_data.get('dc_load_locations', [])
    if location_filter and location_filter not in solar_data['dc_load_locations']:
        solar_data['dc_load_locations'].append(location_filter)

    # Obtener nombre del proyecto solar para el upsert
    proj_record = get_cached_project(project_id)
    proj_name = proj_record.get('folder_name', project_id) if proj_record else project_id

    saved = save_project_result(
        project_id,
        proj_name,
        solar_data,
        {"dc_load_linked": True, "dc_load_source": dc_project_id}
    )

    if not saved:
        raise HTTPException(status_code=500, detail="Error guardando la vinculación en Supabase")

    # Invalidar cache en memoria para que el próximo análisis recargue los datos
    from app.api.v1.endpoints.analysis import invalidate_project_cache
    invalidate_project_cache(project_id)

    return {
        "status": "linked",
        "project_id": project_id,
        "dc_load_project_id": dc_project_id,
        "records_linked": len(dc_records),
        "location_filter": location_filter,
    }


@router.post("/{project_id}/unlink-consumption")
def unlink_dc_consumption(project_id: str):
    """
    Desasocia/elimina la vinculación de consumo DC de un proyecto solar.
    """
    solar_data = get_cached_result_json(project_id)
    if solar_data is None:
        raise HTTPException(status_code=404, detail=f"Proyecto solar '{project_id}' no encontrado en caché")

    # Eliminar campos de consumo DC
    solar_data.pop('dc_load_consumption', None)
    solar_data.pop('dc_load_locations', None)

    proj_record = get_cached_project(project_id)
    proj_name = proj_record.get('folder_name', project_id) if proj_record else project_id

    saved = save_project_result(
        project_id,
        proj_name,
        solar_data,
        {"dc_load_linked": False, "dc_load_folder": None, "dc_load_site": None, "dc_load_source": None}
    )

    if not saved:
        raise HTTPException(status_code=500, detail="Error eliminando la vinculación en Supabase")

    # Invalidar cache en memoria
    from app.api.v1.endpoints.analysis import invalidate_project_cache
    invalidate_project_cache(project_id)

    return {
        "status": "unlinked",
        "project_id": project_id
    }


@router.get("/dc-load/list")
def list_dc_load_projects():
    """
    Lista todos los proyectos de tipo 'dc_load_only' (provisionales)
    disponibles para vincular manualmente a proyectos solares.
    """
    all_projects = list_cached_projects(limit=200)
    dc_projects = [
        p for p in all_projects
        if p.get('metadata', {}).get('project_type') == 'dc_load_only'
    ]
    return {"dc_load_projects": dc_projects}
