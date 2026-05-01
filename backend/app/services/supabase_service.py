"""
Supabase REST API client — sin dependencias extra.
Usa httpx (ya disponible en el entorno) para llamar la PostgREST API de Supabase.
Esto evita la dependencia de pyiceberg que causa problemas en Windows.
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)


def _headers() -> dict:
    """Headers para autenticarse en la PostgREST API de Supabase."""
    return {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def get_cached_project(folder_id: str) -> Optional[dict]:
    """
    Consulta si un proyecto ya fue procesado.
    Retorna el registro completo si existe, o None si no.
    """
    if not _is_configured():
        logger.warning("Supabase no configurado — caché deshabilitado")
        return None

    try:
        url = f"{settings.SUPABASE_URL}/rest/v1/processed_projects"
        params = {
            "folder_id": f"eq.{folder_id}",
            "select": "id,folder_id,folder_name,processed_at,result_json,metadata",
            "limit": "1",
        }
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers=_headers(), params=params)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else None
    except Exception as e:
        logger.error(f"Error consultando caché Supabase: {e}")
        return None


def save_project_result(
    folder_id: str,
    folder_name: str,
    result: dict,
    metadata: Optional[dict] = None,
) -> bool:
    """
    Guarda (o actualiza si ya existe) el resultado de un proyecto en Supabase.
    Usa UPSERT por folder_id para evitar duplicados.
    """
    if not _is_configured():
        logger.warning("Supabase no configurado — no se guardará el resultado")
        return False

    try:
        url = f"{settings.SUPABASE_URL}/rest/v1/processed_projects"
        payload = {
            "folder_id": folder_id,
            "folder_name": folder_name,
            "result_json": result,
            "metadata": metadata or {},
        }
        headers = _headers()
        # Upsert: si ya existe folder_id, actualiza en lugar de insertar
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            logger.info(f"Proyecto '{folder_name}' guardado en Supabase caché")
            return True
    except Exception as e:
        logger.error(f"Error guardando en Supabase: {e}")
        return False


def list_cached_projects(limit: int = 20) -> list:
    """
    Retorna los proyectos procesados más recientes (sin el result_json completo).
    Útil para el panel 'Proyectos Recientes'.
    """
    if not _is_configured():
        return []

    try:
        url = f"{settings.SUPABASE_URL}/rest/v1/processed_projects"
        params = {
            "select": "id,folder_id,folder_name,processed_at,metadata",
            "order": "processed_at.desc",
            "limit": str(limit),
        }
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers=_headers(), params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"Error listando caché Supabase: {e}")
        return []


def get_cached_result_json(folder_id: str) -> Optional[dict]:
    """
    Retorna solo el result_json de un proyecto cacheado (datos pesados).
    """
    record = get_cached_project(folder_id)
    if record:
        return record.get("result_json")
    return None
