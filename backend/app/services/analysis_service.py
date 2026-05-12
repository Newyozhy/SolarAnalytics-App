"""
analysis_service.py — Motor de cálculo para todas las gráficas del sistema.
Fase 1: Generación solar, perfil horario, consumo, baterías, alarmas, SPU.
"""
import pandas as pd
import numpy as np
from typing import Literal, Optional
from datetime import datetime, timedelta

# ─────────────────────────────────────────────────────────────
# HELPERS INTERNOS
# ─────────────────────────────────────────────────────────────

import logging as _logging
_log = _logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# TABLA DE ALIASES DE COLUMNAS (English + Español)
# Clave: substrings normalizados (lower, sin espacios/guiones/acentos)
# Valor: nombre canónico interno
# ─────────────────────────────────────────────────────────────
_COL_ALIASES = {
    # start_time — inglés y español (ZTE/Huawei)
    'start_time':        'start_time',
    'starttime':         'start_time',
    'hora_inicio':       'start_time',
    'hora_de_inicio':    'start_time',
    'tiempo_inicio':     'start_time',
    'tiempo_de_inicio':  'start_time',
    'inicio':            'start_time',
    'fecha_inicio':      'start_time',
    'fecha_de_inicio':   'start_time',
    'fecha/hora_inicio': 'start_time',
    'hora_inicial':      'start_time',
    # end_time
    'end_time':          'end_time',
    'endtime':           'end_time',
    'hora_fin':          'end_time',
    'hora_de_fin':       'end_time',
    'tiempo_fin':        'end_time',
    'tiempo_de_fin':     'end_time',
    'fin':               'end_time',
    'fecha_fin':         'end_time',
    'fecha_de_fin':      'end_time',
    'fecha/hora_fin':    'end_time',
    'hora_final':        'end_time',
    # duration_min
    'duration':          'duration_min',
    'duracion':          'duration_min',
    'duracion_(min)':    'duration_min',
    'duracion_min':      'duration_min',
    'tiempo_(min)':      'duration_min',
    'tiempo_total_(min)':'duration_min',
    'tiempo_total':      'duration_min',
    'minutos':           'duration_min',
    # initial_kwh
    'initial':           'initial_kwh',
    'initial_kwh':       'initial_kwh',
    'energia_inicial':   'initial_kwh',
    'energia_inicial_(kwh)': 'initial_kwh',
    'kwh_inicial':       'initial_kwh',
    'generacion_inicial':'initial_kwh',
    'valor_inicial':     'initial_kwh',
    # final_kwh
    'final':             'final_kwh',
    'final_kwh':         'final_kwh',
    'energia_final':     'final_kwh',
    'energia_final_(kwh)': 'final_kwh',
    'kwh_final':         'final_kwh',
    'generacion_final':  'final_kwh',
    'valor_final':       'final_kwh',
}


def _normalize_col(name: str) -> str:
    """Normaliza un nombre de columna: lower, sin BOM/acentos/espacios/guiones/paréntesis."""
    import unicodedata
    # Eliminar BOM y strip
    s = name.lstrip('\ufeff').strip()
    # Quitar acentos (NFD → solo ASCII)
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    # Lower y reemplazar separadores por guión bajo
    s = s.lower()
    for ch in (' ', '-', '/', '(', ')', '.', ':'):
        s = s.replace(ch, '_')
    # Colapsar múltiples guiones bajos
    import re as _re
    s = _re.sub(r'_+', '_', s).strip('_')
    return s


def _rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renombra columnas usando la tabla de aliases.
    Primero intenta match exacto por clave normalizada,
    luego intenta match por substring para nombres compuestos.
    """
    df = df.copy()
    # Limpiar BOM global
    df.columns = [c.lstrip('\ufeff').strip() for c in df.columns]

    rename = {}
    for col in df.columns:
        norm = _normalize_col(col)
        if norm in _COL_ALIASES:
            rename[col] = _COL_ALIASES[norm]
        else:
            # Match por substring (para nombres largos con info extra)
            matched = None
            for alias_key, canonical in _COL_ALIASES.items():
                if alias_key in norm:
                    matched = canonical
                    break
            if matched:
                rename[col] = matched

    return df.rename(columns=rename)


def _parse_solar(df: pd.DataFrame) -> pd.DataFrame:
    """Limpia solar_work_rec.csv y agrega columnas derivadas (English + Español)."""
    if df is None or df.empty:
        return pd.DataFrame()
    df = _rename_columns(df)

    # Guard: columnas mínimas requeridas
    if 'start_time' not in df.columns:
        _log.warning(
            "_parse_solar: columna 'start_time' no encontrada tras rename. "
            "Columnas disponibles: %s", list(df.columns)
        )
        return pd.DataFrame()
    if 'end_time' not in df.columns:
        _log.warning(
            "_parse_solar: columna 'end_time' no encontrada tras rename. "
            "Columnas disponibles: %s", list(df.columns)
        )
        return pd.DataFrame()

    df['start_time'] = pd.to_datetime(df['start_time'], errors='coerce')
    df['end_time'] = pd.to_datetime(df['end_time'], errors='coerce')
    df = df.dropna(subset=['start_time', 'end_time'])
    for c in ['duration_min', 'initial_kwh', 'final_kwh']:
        df[c] = pd.to_numeric(df.get(c, pd.Series(dtype=float)), errors='coerce').fillna(0)
    df['kwh'] = (df['final_kwh'] - df['initial_kwh']).clip(lower=0)
    df['date'] = df['start_time'].dt.date
    df['duration_h'] = df['duration_min'] / 60
    return df


def _group_key(dates: pd.Series, granularity: str) -> pd.Series:
    """Genera la clave de agrupamiento: 'day', 'week' o 'month'."""
    dt = pd.to_datetime(dates)
    if granularity == 'week':
        return dt.dt.strftime('%G-W%V')   # ISO week: "2025-W07"
    if granularity == 'month':
        return dt.dt.strftime('%Y-%m')
    return dt.dt.strftime('%Y-%m-%d')


def _label(key: str, granularity: str) -> str:
    """Convierte clave de agrupamiento a etiqueta legible."""
    if granularity == 'week':
        parts = key.split('-W')
        return f"Sem {int(parts[1])} · {parts[0]}"
    if granularity == 'month':
        months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        y, m = key.split('-')
        return f"{months[int(m)-1]} {y}"
    # day → just return as-is
    return key


def _detect_outlier_sessions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Marca como 'puesta_en_marcha' los días iniciales cuya generación
    es < 30% de la mediana general del período.
    Retorna df con columna 'is_outlier' (bool) y 'outlier_reason' (str).
    """
    if df.empty:
        return df
    daily = df.groupby('date')['kwh'].sum()
    median_kwh = daily.median()
    threshold = median_kwh * 0.30
    outlier_dates = set(daily[daily < threshold].index[:7])  # solo primeros 7 días
    df['is_outlier'] = df['date'].isin(outlier_dates)
    df['outlier_reason'] = df['is_outlier'].map(
        lambda x: f"Generación < 30% de la mediana ({median_kwh:.2f} kWh/día) — posible período de puesta en marcha" if x else ""
    )
    return df


# ─────────────────────────────────────────────────────────────
# A-1: PRODUCCIÓN POR PERÍODO (Días / Semanas / Meses)
# ─────────────────────────────────────────────────────────────

def get_generation_by_period(
    df_solar: pd.DataFrame,
    granularity: Literal['day', 'week', 'month'] = 'day',
    metric: Literal['kwh', 'duration'] = 'kwh',
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_outliers: bool = False,
) -> dict:
    """
    Panel A-1: Producción solar agrupada por período.
    Retorna barras con promedio diario, sesiones fragmentadas y outliers.
    """
    df = _parse_solar(df_solar)
    if df.empty:
        return {"data": [], "outliers": [], "summary": {}}

    df = _detect_outlier_sessions(df)

    # Filtro de fechas
    if date_from:
        df = df[df['start_time'] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df['start_time'] <= pd.to_datetime(date_to)]

    # Excluir outliers por defecto
    outlier_info = []
    if not include_outliers:
        outliers = df[df['is_outlier']].groupby('date').agg(
            kwh=('kwh', 'sum'),
            reason=('outlier_reason', 'first')
        ).reset_index()
        for _, row in outliers.iterrows():
            outlier_info.append({
                "date": str(row['date']),
                "kwh": round(row['kwh'], 3),
                "reason": row['reason'],
                "criterion": "< 30% de la mediana del período"
            })
        df = df[~df['is_outlier']]

    if df.empty:
        return {"data": [], "outliers": outlier_info, "summary": {}}

    # Sesiones por día (indicador de fragmentación)
    sessions_per_day = df.groupby('date').size().reset_index(name='sessions')

    # Grupo temporal
    df['period'] = _group_key(pd.to_datetime(df['date']), granularity)

    # Agrupamiento
    agg_value = 'kwh' if metric == 'kwh' else 'duration_h'
    agg_col = 'Energía (kWh)' if metric == 'kwh' else 'Duración (h)'

    grouped = df.groupby('period').agg(
        total_value=(agg_value, 'sum'),
        n_days=('date', 'nunique'),
        total_sessions=('kwh', 'count'),
    ).reset_index()
    grouped['avg_per_day'] = (grouped['total_value'] / grouped['n_days']).round(3)
    grouped['total_value'] = grouped['total_value'].round(3)
    grouped['label'] = grouped['period'].apply(lambda k: _label(k, granularity))

    # Días con alta fragmentación (≥3 sesiones) dentro del período
    sessions_per_day['period'] = _group_key(pd.to_datetime(sessions_per_day['date']), granularity)
    fragmented_days = sessions_per_day[sessions_per_day['sessions'] >= 3].groupby('period').agg(
        fragmented_days=('date', 'count'),
        max_sessions=('sessions', 'max')
    ).reset_index()
    grouped = grouped.merge(fragmented_days, on='period', how='left')
    grouped['fragmented_days'] = grouped['fragmented_days'].fillna(0).astype(int)
    grouped['max_sessions'] = grouped['max_sessions'].fillna(0).astype(int)

    # Summary global
    total = df['kwh'].sum()
    days = df['date'].nunique()
    summary = {
        "total_kwh": round(total, 2),
        "total_days": days,
        "avg_kwh_per_day": round(total / days, 2) if days > 0 else 0,
        "period_start": str(df['date'].min()),
        "period_end": str(df['date'].max()),
        "fragmented_days_count": int(sessions_per_day[sessions_per_day['sessions'] >= 3]['date'].nunique()),
        "unit": agg_col,
    }

    data = grouped.rename(columns={
        'total_value': 'value',
        'avg_per_day': 'avg_per_day',
    }).to_dict(orient='records')

    return {"data": data, "outliers": outlier_info, "summary": summary}


# ─────────────────────────────────────────────────────────────
# A-2 / A-3: PERFIL HORARIO (Minutos / kWh / kWh Acumulado)
# ─────────────────────────────────────────────────────────────

def get_hourly_profile(
    df_solar: pd.DataFrame,
    metric: Literal['minutes', 'kwh', 'kwh_cumulative'] = 'kwh',
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_outliers: bool = False,
) -> dict:
    """
    Panel A-2: Distribución horaria de generación.
    Usa vectorización con pd.interval_range — más eficiente que la lógica IF/AND del Excel.
    """
    df = _parse_solar(df_solar)
    if df.empty:
        return {"data": [], "summary": {}}

    df = _detect_outlier_sessions(df)
    if date_from:
        df = df[df['start_time'] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df['start_time'] <= pd.to_datetime(date_to)]
    if not include_outliers:
        df = df[~df['is_outlier']]
    if df.empty:
        return {"data": [], "summary": {}}

    # Generar registros horarios vectorizados
    records = []
    for _, row in df.iterrows():
        start = row['start_time']
        end = row['end_time']
        kwh = row['kwh']
        total_secs = (end - start).total_seconds()
        if total_secs <= 0:
            continue

        # Horas enteras cubiertas por la sesión
        h_start = start.replace(minute=0, second=0, microsecond=0)
        h_end = end.replace(minute=0, second=0, microsecond=0)
        hours = pd.date_range(h_start, h_end, freq='h')

        for h in hours:
            seg_start = max(start, h)
            seg_end = min(end, h + pd.Timedelta('1h'))
            if seg_end <= seg_start:
                continue
            seg_secs = (seg_end - seg_start).total_seconds()
            fraction = seg_secs / total_secs
            records.append({
                'hour': h.hour,
                'minutes': seg_secs / 60,
                'kwh': kwh * fraction,
            })

    if not records:
        return {"data": [], "summary": {}}

    hourly = pd.DataFrame(records)
    n_days = df['date'].nunique()

    result = hourly.groupby('hour').agg(
        avg_minutes=('minutes', 'mean'),
        avg_kwh=('kwh', 'mean'),
        total_kwh=('kwh', 'sum'),
    ).reindex(range(24), fill_value=0).reset_index()

    result['avg_minutes'] = result['avg_minutes'].round(2)
    result['avg_kwh'] = result['avg_kwh'].round(4)
    result['total_kwh'] = result['total_kwh'].round(4)
    result['hour_label'] = result['hour'].apply(lambda h: f"{h:02d}:00")

    value_col = {
        'minutes': 'avg_minutes',
        'kwh': 'avg_kwh',
        'kwh_cumulative': 'total_kwh',
    }[metric]
    result['value'] = result[value_col]

    summary = {
        "n_days": n_days,
        "peak_hour": int(result.loc[result['value'].idxmax(), 'hour']),
        "peak_value": round(float(result['value'].max()), 3),
        "metric": metric,
        "period_start": str(df['date'].min()),
        "period_end": str(df['date'].max()),
    }

    return {"data": result.to_dict(orient='records'), "summary": summary}


# ─────────────────────────────────────────────────────────────
# A-3: HEATMAP CALENDÁRICO
# ─────────────────────────────────────────────────────────────

def get_calendar_heatmap(df_solar: pd.DataFrame, include_outliers: bool = False) -> dict:
    """Panel A-3: datos para heatmap tipo GitHub contributions."""
    df = _parse_solar(df_solar)
    if df.empty:
        return {"data": [], "max_kwh": 0}

    df = _detect_outlier_sessions(df)
    if not include_outliers:
        df = df[~df['is_outlier']]

    daily = df.groupby('date').agg(
        kwh=('kwh', 'sum'),
        sessions=('kwh', 'count'),
    ).reset_index()
    daily['kwh'] = daily['kwh'].round(3)
    daily['is_fragmented'] = daily['sessions'] >= 3
    daily['date'] = daily['date'].astype(str)

    return {
        "data": daily.to_dict(orient='records'),
        "max_kwh": round(float(daily['kwh'].max()), 3),
        "avg_kwh": round(float(daily['kwh'].mean()), 3),
    }


# ─────────────────────────────────────────────────────────────
# B-1: PERFIL DE CONSUMO COMERCIAL vs SOLAR
# ─────────────────────────────────────────────────────────────

def get_consumption_profile(
    df_solar: pd.DataFrame,
    base_consumption_kwh_per_hour: float,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """
    Panel B-1: Consumo base vs generación solar por hora del día.
    net_consumption = base - solar_avg (ahorro de la red)
    """
    hourly = get_hourly_profile(df_solar, metric='kwh', date_from=date_from, date_to=date_to)
    if not hourly["data"]:
        return {"data": [], "summary": {}}

    rows = []
    total_savings_kwh = 0
    for h in hourly["data"]:
        solar = h['avg_kwh']
        base = base_consumption_kwh_per_hour
        net = max(0, base - solar)
        saving = base - net
        total_savings_kwh += saving
        rows.append({
            "hour": h['hour'],
            "hour_label": h['hour_label'],
            "base_consumption": round(base, 4),
            "solar_generation": round(solar, 4),
            "net_consumption": round(net, 4),
            "saving": round(saving, 4),
        })

    daily_base = base_consumption_kwh_per_hour * 24
    daily_solar = sum(r['solar_generation'] for r in rows)
    pct_autonomy = (daily_solar / daily_base * 100) if daily_base > 0 else 0

    summary = {
        "daily_base_kwh": round(daily_base, 2),
        "daily_solar_avg_kwh": round(daily_solar, 3),
        "daily_net_consumption_kwh": round(daily_base - daily_solar, 3),
        "pct_solar_autonomy": round(pct_autonomy, 1),
        "base_consumption_source": "manual",
    }
    return {"data": rows, "summary": summary}


# ─────────────────────────────────────────────────────────────
# B-2: KPIs DE AHORRO POR PERÍODO
# ─────────────────────────────────────────────────────────────

def get_savings_by_period(
    df_solar: pd.DataFrame,
    base_consumption_kwh_per_hour: float,
    tariff_per_kwh: float,
    granularity: Literal['week', 'month'] = 'month',
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """Panel B-2: kWh ahorrados y $ ahorrado por período."""
    df = _parse_solar(df_solar)
    if df.empty:
        return {"data": [], "kpis": {}}

    df = _detect_outlier_sessions(df)
    df = df[~df['is_outlier']]
    if date_from:
        df = df[df['start_time'] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df['start_time'] <= pd.to_datetime(date_to)]
    if df.empty:
        return {"data": [], "kpis": {}}

    df['period'] = _group_key(pd.to_datetime(df['date']), granularity)
    grouped = df.groupby('period').agg(
        solar_kwh=('kwh', 'sum'),
        n_days=('date', 'nunique'),
    ).reset_index()
    grouped['base_kwh'] = grouped['n_days'] * base_consumption_kwh_per_hour * 24
    grouped['net_kwh'] = (grouped['base_kwh'] - grouped['solar_kwh']).clip(lower=0)
    grouped['saved_kwh'] = (grouped['base_kwh'] - grouped['net_kwh']).round(3)
    grouped['saved_usd'] = (grouped['saved_kwh'] * tariff_per_kwh).round(2)
    grouped['solar_kwh'] = grouped['solar_kwh'].round(3)
    grouped['base_kwh'] = grouped['base_kwh'].round(3)
    grouped['net_kwh'] = grouped['net_kwh'].round(3)
    grouped['label'] = grouped['period'].apply(lambda k: _label(k, granularity))

    total_solar = grouped['solar_kwh'].sum()
    total_base = grouped['base_kwh'].sum()
    total_saved = grouped['saved_kwh'].sum()

    kpis = {
        "total_solar_kwh": round(total_solar, 2),
        "total_base_kwh": round(total_base, 2),
        "total_saved_kwh": round(total_saved, 2),
        "total_saved_usd": round(total_saved * tariff_per_kwh, 2),
        "pct_autonomy": round(total_solar / total_base * 100, 1) if total_base > 0 else 0,
        "tariff_per_kwh": tariff_per_kwh,
        "currency": "USD",
    }
    return {"data": grouped.to_dict(orient='records'), "kpis": kpis}


# ─────────────────────────────────────────────────────────────
# C-1: ESTADO DE BATERÍAS
# ─────────────────────────────────────────────────────────────

def get_battery_status(
    df_history: pd.DataFrame,
    metric: Literal['soc', 'soh', 'voltage'] = 'soc',
    granularity: Literal['day', 'week', 'month'] = 'day',
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """Panel C-1: SOC / SOH / Voltaje de baterías agrupado por período."""
    if df_history is None or df_history.empty:
        return {"data": [], "alerts": [], "summary": {}}

    df = df_history.copy()
    df['save_time'] = pd.to_datetime(df['save_time'], errors='coerce')
    df['value'] = pd.to_numeric(df['value'], errors='coerce')
    df = df.dropna(subset=['save_time', 'value'])

    signal_map = {
        'soc': 'Battery Present SOC',
        'soh': 'Battery SOH',
        'voltage': 'Battery Voltage',
    }
    signal_filter = signal_map[metric]
    unit_map = {'soc': '%', 'soh': '%', 'voltage': 'V'}

    df = df[
        df['device_name'].str.contains('Battery_', na=False) &
        df['signal_name'].str.contains(signal_filter, na=False)
    ].copy()

    if df.empty:
        return {"data": [], "alerts": [], "summary": {"unit": unit_map[metric]}}

    if date_from:
        df = df[df['save_time'] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df['save_time'] <= pd.to_datetime(date_to)]

    df['date'] = df['save_time'].dt.date
    df['period'] = _group_key(pd.to_datetime(df['date']), granularity)

    grouped = df.groupby(['period', 'device_name'])['value'].mean().reset_index()
    grouped['value'] = grouped['value'].round(2)
    grouped['label'] = grouped['period'].apply(lambda k: _label(k, granularity))

    # Alertas SOH < 80%
    alerts = []
    if metric == 'soh':
        low_soh = grouped[grouped['value'] < 80]
        for _, row in low_soh.iterrows():
            alerts.append({
                "device": row['device_name'],
                "period": row['period'],
                "soh": row['value'],
                "message": f"SOH bajo ({row['value']:.1f}%) — revisar reemplazo de batería",
            })

    # Pivot para tener una columna por batería
    pivot = grouped.pivot_table(index=['period','label'], columns='device_name', values='value').reset_index()
    pivot.columns.name = None
    pivot = pivot.sort_values('period')

    summary = {
        "metric": metric,
        "unit": unit_map[metric],
        "devices": [c for c in pivot.columns if c not in ('period', 'label')],
        "n_periods": len(pivot),
        "alert_count": len(alerts),
    }
    if metric == 'voltage':
        summary["thresholds"] = {"LLVD1": 47, "BLVD": 46}

    return {
        "data": pivot.fillna(None).to_dict(orient='records'),
        "alerts": alerts,
        "summary": summary,
    }


# ─────────────────────────────────────────────────────────────
# D-1: RENDIMIENTO POR CANAL SPU
# ─────────────────────────────────────────────────────────────

def get_spu_channel_energy(df_history: pd.DataFrame) -> dict:
    """Panel D-1: Energía total acumulada por canal SPU (comparativo horizontal)."""
    if df_history is None or df_history.empty:
        return {"data": [], "warnings": []}

    df = df_history.copy()
    df['value'] = pd.to_numeric(df['value'], errors='coerce')
    df['save_time'] = pd.to_datetime(df['save_time'], errors='coerce')
    df = df.dropna(subset=['value', 'save_time'])

    # Buscar señales SPU Power Total Generation
    mask = (
        df['device_name'].str.contains('SPCU', na=False) &
        df['signal_name'].str.contains('SPU Power Total Generation', na=False)
    )
    df_spu = df[mask].copy()

    warnings = []
    if df_spu.empty:
        warnings.append({
            "code": "NO_SPCU_DATA",
            "message": "No se encontraron datos de canales SPU (SPCU_*) en este proyecto.",
        })
        return {"data": [], "warnings": warnings}

    # Último valor (acumulador) por canal
    latest = df_spu.sort_values('save_time').groupby('signal_name').last()['value'].reset_index()
    latest.columns = ['signal_name', 'total_kwh']
    latest['channel'] = latest['signal_name'].str.extract(r'\[(\d+)\]').astype(str)
    latest['total_kwh'] = latest['total_kwh'].round(3)
    latest = latest.sort_values('channel')

    # Alerta si algún canal tiene < 50% del promedio (posible falla)
    avg = latest['total_kwh'].mean()
    for _, row in latest.iterrows():
        if row['total_kwh'] < avg * 0.5:
            warnings.append({
                "code": "LOW_CHANNEL_OUTPUT",
                "channel": row['channel'],
                "kwh": row['total_kwh'],
                "avg_kwh": round(avg, 3),
                "message": f"Canal {row['channel']} genera solo {row['total_kwh']:.2f} kWh ({row['total_kwh']/avg*100:.0f}% del promedio). Verificar panel o string.",
            })

    return {"data": latest.to_dict(orient='records'), "warnings": warnings, "avg_kwh": round(avg, 3)}


# ─────────────────────────────────────────────────────────────
# E-1: ALARMAS
# ─────────────────────────────────────────────────────────────

def get_alarms(
    df_alarms: pd.DataFrame,
    levels: Optional[list] = None,
    device: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
) -> dict:
    """Panel E-1: Timeline de alarmas con filtros."""
    if df_alarms is None or df_alarms.empty:
        return {"data": [], "kpis": {}, "by_device": [], "by_level": []}

    df = df_alarms.copy()
    df['start_time'] = pd.to_datetime(df['start_time'], errors='coerce')
    df['end_time'] = pd.to_datetime(df['end_time'], errors='coerce')
    df['level'] = pd.to_numeric(df['level'], errors='coerce')
    df = df.dropna(subset=['start_time', 'level'])

    level_labels = {1: 'Critical', 2: 'Major', 3: 'Minor', 4: 'Warning'}
    df['level_name'] = df['level'].map(level_labels).fillna('Unknown')
    df['duration_min'] = ((df['end_time'] - df['start_time']).dt.total_seconds() / 60).round(1)

    if levels:
        df = df[df['level'].isin([int(l) for l in levels])]
    if device:
        df = df[df['device_name'].str.contains(device, case=False, na=False)]
    if date_from:
        df = df[df['start_time'] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df['start_time'] <= pd.to_datetime(date_to)]

    if df.empty:
        return {"data": [], "kpis": {}, "by_device": [], "by_level": []}

    kpis = {
        "total": int(len(df)),
        "critical": int((df['level'] == 1).sum()),
        "major": int((df['level'] == 2).sum()),
        "minor": int((df['level'] == 3).sum()),
        "warning": int((df['level'] == 4).sum()),
        "unique_devices": int(df['device_name'].nunique()),
    }

    by_device = df.groupby('device_name').size().reset_index(name='count')
    by_device = by_device.sort_values('count', ascending=False).head(10).to_dict(orient='records')

    by_level = df.groupby('level_name').size().reset_index(name='count').to_dict(orient='records')

    data = df.sort_values('start_time', ascending=False).head(limit)
    data['start_time'] = data['start_time'].dt.strftime('%Y-%m-%d %H:%M:%S')
    data['end_time'] = data['end_time'].dt.strftime('%Y-%m-%d %H:%M:%S')

    return {
        "data": data[['device_name','signal_name','start_time','end_time','level','level_name','duration_min']].to_dict(orient='records'),
        "kpis": kpis,
        "by_device": by_device,
        "by_level": by_level,
    }


# ─────────────────────────────────────────────────────────────
# D-2: POTENCIA DC DEL SISTEMA (Load / Source / Temperatura)
# ─────────────────────────────────────────────────────────────

def get_system_power(
    df_history: pd.DataFrame,
    granularity: Literal['day', 'week', 'month'] = 'day',
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """
    Panel Sistema: evolución temporal de potencia DC de carga,
    potencia DC solar y temperatura de equipos.
    Señales buscadas (case-insensitive):
      - 'DC Load Power'  → carga del sistema
      - 'DC Source Power' / 'SPU Power Total Generation' → generación
      - 'Temperature' → temperatura gabinetes
    """
    if df_history is None or df_history.empty:
        return {"traces": [], "devices": [], "summary": {}}

    df = df_history.copy()
    df['save_time'] = pd.to_datetime(df['save_time'], errors='coerce')
    df['value']     = pd.to_numeric(df['value'], errors='coerce')
    df = df.dropna(subset=['save_time', 'value'])

    if date_from:
        df = df[df['save_time'] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df['save_time'] <= pd.to_datetime(date_to)]

    df['date']   = df['save_time'].dt.date
    df['period'] = _group_key(pd.to_datetime(df['date']), granularity)

    # ── Signal classification ──────────────────────────────────
    def classify(sig: str) -> str:
        s = sig.lower()
        if 'dc load power' in s:
            return 'load'
        if 'dc source power' in s or 'spu power total generation' in s:
            return 'source'
        if 'temperature' in s:
            return 'temp'
        return 'other'

    df['signal_class'] = df['signal_name'].apply(classify)
    df = df[df['signal_class'] != 'other'].copy()

    if df.empty:
        return {"traces": [], "devices": [], "summary": {"granularity": granularity}}

    traces = []
    label_map = {'load': 'Carga DC (kW)', 'source': 'Fuente DC / Solar (kW)', 'temp': 'Temperatura (°C)'}
    color_map = {'load': '#EF4444', 'source': '#00A86B', 'temp': '#F59E0B'}
    unit_map  = {'load': 'kW', 'source': 'kW', 'temp': '°C'}

    for cls in ['source', 'load', 'temp']:
        subset = df[df['signal_class'] == cls]
        if subset.empty:
            continue
        grouped = subset.groupby('period')['value'].mean().reset_index()
        grouped['value'] = grouped['value'].round(3)
        grouped['label'] = grouped['period'].apply(lambda k: _label(k, granularity))
        traces.append({
            "class":  cls,
            "name":   label_map[cls],
            "color":  color_map[cls],
            "unit":   unit_map[cls],
            "data":   grouped[['period', 'label', 'value']].to_dict(orient='records'),
        })

    # Device list
    devices = sorted(df['device_name'].unique().tolist())

    # Summary: last avg per class
    summary = {"granularity": granularity, "device_count": len(devices)}
    for cls in ['source', 'load', 'temp']:
        cls_data = df[df['signal_class'] == cls]
        if not cls_data.empty:
            summary[f"avg_{cls}"] = round(float(cls_data['value'].mean()), 2)
            summary[f"max_{cls}"] = round(float(cls_data['value'].max()), 2)

    return {"traces": traces, "devices": devices, "summary": summary}
