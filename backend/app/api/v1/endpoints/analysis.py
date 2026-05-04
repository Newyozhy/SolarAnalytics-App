"""
analysis.py — Endpoints de análisis de gráficas (Fase 1).
Prefijo: /api/v1/analysis/{project_id}/
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Literal
import gc

from app.services.drive_service import get_drive_service, download_project_data
from app.services.supabase_service import get_cached_result_json
from app.services import analysis_service as svc
import pandas as pd

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# HELPER — Carga DataFrames del proyecto (caché → Drive)
# ─────────────────────────────────────────────────────────────

def _load_project_dataframes(project_id: str) -> dict:
    """
    Carga los DataFrames del proyecto desde Drive.
    Retorna dict: {csv_name: DataFrame}
    """
    try:
        service = get_drive_service()
        dataframes = download_project_data(service, project_id)
        return dataframes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cargando datos del proyecto: {str(e)}")


def _get_solar_df(dataframes: dict) -> pd.DataFrame:
    return dataframes.get("solar_work_rec", pd.DataFrame())


def _get_history_df(dataframes: dict) -> pd.DataFrame:
    return dataframes.get("history_data", pd.DataFrame())


def _get_alarms_df(dataframes: dict) -> pd.DataFrame:
    return dataframes.get("history_alarm", pd.DataFrame())


# ─────────────────────────────────────────────────────────────
# A-1: Producción por período
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/generation")
def get_generation(
    project_id: str,
    granularity: Literal['day', 'week', 'month'] = Query('day', description="Agrupamiento temporal"),
    metric: Literal['kwh', 'duration'] = Query('kwh', description="Métrica: energía o duración"),
    date_from: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    include_outliers: bool = Query(True, description="Mostrar días atípicos (True por defecto). Desactivar para excluirlos."),
):
    """
    Panel A-1: Producción solar por período.
    Retorna barras agrupadas con indicadores de fragmentación y outliers excluidos.
    """
    dfs = _load_project_dataframes(project_id)
    df_solar = _get_solar_df(dfs)
    try:
        result = svc.get_generation_by_period(
            df_solar, granularity=granularity, metric=metric,
            date_from=date_from, date_to=date_to, include_outliers=include_outliers,
        )
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# A-2: Perfil horario
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/hourly-profile")
def get_hourly_profile(
    project_id: str,
    metric: Literal['minutes', 'kwh', 'kwh_cumulative'] = Query('kwh'),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    include_outliers: bool = Query(True),
):
    """
    Panel A-2: Distribución horaria (00:00–23:00).
    Minutos activos promedio / kWh promedio / kWh totales acumulados.
    """
    dfs = _load_project_dataframes(project_id)
    df_solar = _get_solar_df(dfs)
    try:
        result = svc.get_hourly_profile(
            df_solar, metric=metric,
            date_from=date_from, date_to=date_to, include_outliers=include_outliers,
        )
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# A-3: Heatmap calendárico
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/calendar-heatmap")
def get_calendar_heatmap(
    project_id: str,
    include_outliers: bool = Query(True),
):
    """Panel A-3: Datos para heatmap calendárico (GitHub-style)."""
    dfs = _load_project_dataframes(project_id)
    df_solar = _get_solar_df(dfs)
    try:
        result = svc.get_calendar_heatmap(df_solar, include_outliers=include_outliers)
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# B-1: Perfil de consumo comercial vs solar
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/consumption-profile")
def get_consumption_profile(
    project_id: str,
    base_consumption_kwh_per_hour: float = Query(..., description="Consumo base del sitio en kWh/h (editable por proyecto)"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """
    Panel B-1: Perfil horario — consumo base vs generación solar vs consumo neto.
    Muestra la zona de ahorro (base - solar) por cada hora del día.
    """
    dfs = _load_project_dataframes(project_id)
    df_solar = _get_solar_df(dfs)
    try:
        result = svc.get_consumption_profile(
            df_solar,
            base_consumption_kwh_per_hour=base_consumption_kwh_per_hour,
            date_from=date_from, date_to=date_to,
        )
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# B-2: KPIs de ahorro por período
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/savings")
def get_savings(
    project_id: str,
    base_consumption_kwh_per_hour: float = Query(...),
    tariff_per_kwh: float = Query(..., description="Tarifa eléctrica en USD/kWh (configurable por ciudad/proyecto)"),
    granularity: Literal['week', 'month'] = Query('month'),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Panel B-2: kWh ahorrados y dinero ahorrado por semana/mes."""
    dfs = _load_project_dataframes(project_id)
    df_solar = _get_solar_df(dfs)
    try:
        result = svc.get_savings_by_period(
            df_solar,
            base_consumption_kwh_per_hour=base_consumption_kwh_per_hour,
            tariff_per_kwh=tariff_per_kwh,
            granularity=granularity,
            date_from=date_from, date_to=date_to,
        )
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# C-1: Estado de baterías
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/battery")
def get_battery(
    project_id: str,
    metric: Literal['soc', 'soh', 'voltage'] = Query('soc'),
    granularity: Literal['day', 'week', 'month'] = Query('day'),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """
    Panel C-1: SOC / SOH / Voltaje DC de baterías en el tiempo.
    Alerta automática si SOH < 80%.
    """
    dfs = _load_project_dataframes(project_id)
    df_hist = _get_history_df(dfs)
    try:
        result = svc.get_battery_status(
            df_hist, metric=metric, granularity=granularity,
            date_from=date_from, date_to=date_to,
        )
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# D-1: Rendimiento por canal SPU
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/spu-channels")
def get_spu_channels(project_id: str):
    """
    Panel D-1: Energía total generada por cada canal SPU.
    Incluye advertencia si algún canal genera menos del 50% del promedio
    o si el sitio no tiene datos SPCU.
    """
    dfs = _load_project_dataframes(project_id)
    df_hist = _get_history_df(dfs)
    try:
        result = svc.get_spu_channel_energy(df_hist)
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# E-1: Alarmas con filtros
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/alarms")
def get_alarms(
    project_id: str,
    levels: Optional[str] = Query(None, description="Filtro niveles: '1,2,3,4' (Critical,Major,Minor,Warning)"),
    device: Optional[str] = Query(None, description="Filtro por nombre de dispositivo"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
):
    """
    Panel E-1: Timeline de alarmas con KPIs, agrupado por dispositivo y nivel.
    """
    level_list = [int(l) for l in levels.split(',')] if levels else None
    dfs = _load_project_dataframes(project_id)
    df_alarms = _get_alarms_df(dfs)
    try:
        result = svc.get_alarms(
            df_alarms, levels=level_list, device=device,
            date_from=date_from, date_to=date_to, limit=limit,
        )
    finally:
        del dfs; gc.collect()
    return result


# ─────────────────────────────────────────────────────────────
# D-2: Potencia DC del sistema (load / source / temperatura)
# ─────────────────────────────────────────────────────────────

@router.get("/{project_id}/system-power")
def get_system_power(
    project_id: str,
    granularity: Literal['day', 'week', 'month'] = Query('day'),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """
    Panel Sistema: evolución temporal de potencia DC (carga vs solar) y temperatura.
    """
    dfs = _load_project_dataframes(project_id)
    df_hist = _get_history_df(dfs)
    try:
        result = svc.get_system_power(
            df_hist, granularity=granularity,
            date_from=date_from, date_to=date_to,
        )
    finally:
        del dfs; gc.collect()
    return result
