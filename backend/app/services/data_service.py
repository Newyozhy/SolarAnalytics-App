import pandas as pd
import numpy as np
import logging as _logging
_log = _logging.getLogger(__name__)


def clean_solar_work_rec(df):
    """
    Limpia y procesa el DataFrame de solar_work_rec.csv.
    Soporta nombres de columnas en Español e Inglés (ZTE/Huawei).
    Calcula la generación neta de energía por sesión y por día.
    """
    if df is None or df.empty:
        return pd.DataFrame()

    # Reutilizar la lógica centralizada de rename (English + Español)
    from app.services.analysis_service import _rename_columns
    df = _rename_columns(df.copy())

    # Guard: columnas mínimas requeridas
    if 'start_time' not in df.columns:
        _log.warning(
            "clean_solar_work_rec: 'start_time' no encontrado tras rename. "
            "Columnas disponibles: %s", list(df.columns)
        )
        return pd.DataFrame()

    # Convertir a datetime
    df['start_time'] = pd.to_datetime(df['start_time'], errors='coerce')
    if 'end_time' in df.columns:
        df['end_time'] = pd.to_datetime(df['end_time'], errors='coerce')

    for col in ['duration_min', 'initial_kwh', 'final_kwh']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    if 'initial_kwh' in df.columns and 'final_kwh' in df.columns:
        df['net_generation_kwh'] = df['final_kwh'] - df['initial_kwh']
        df['net_generation_kwh'] = df['net_generation_kwh'].clip(lower=0)
    else:
        df['net_generation_kwh'] = 0

    df = df.dropna(subset=['start_time'])
    df['date'] = df['start_time'].dt.date

    return df

def get_daily_generation(df_clean):
    """
    Agrupa el df procesado de solar_work_rec por día.
    """
    if df_clean is None or df_clean.empty or 'date' not in df_clean.columns:
        return pd.DataFrame()
        
    daily_df = df_clean.groupby('date').agg(
        total_generation_kwh=('net_generation_kwh', 'sum'),
        total_duration_min=('duration_min', 'sum')
    ).reset_index()
    
    daily_df = daily_df.sort_values('date')
    
    # Asegurarnos que la columna date se pueda serializar a JSON
    daily_df['date'] = daily_df['date'].astype(str)
    
    return daily_df

def clean_history_data(df):
    """
    Limpia y filtra history_data.csv para obtener métricas clave.
    """
    if df is None or df.empty:
        return {}
        
    df = df.copy()
    
    if 'save_time' in df.columns:
        df['save_time'] = pd.to_datetime(df['save_time'], errors='coerce')
    
    if 'value' in df.columns:
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        
    result = {}
    
    if 'signal_name' in df.columns:
        # SOC de baterías
        soc_mask = df['signal_name'].str.contains('SOC', case=False, na=False)
        if soc_mask.any():
            df_soc = df[soc_mask][['save_time', 'device_name', 'signal_name', 'value']].copy()
            df_soc.set_index('save_time', inplace=True)
            df_soc_hourly = df_soc.groupby(['device_name', pd.Grouper(freq='h')])['value'].mean().reset_index()
            # Hacer serializable a JSON
            df_soc_hourly['save_time'] = df_soc_hourly['save_time'].dt.strftime('%Y-%m-%d %H:%M:%S')
            result['battery_soc'] = df_soc_hourly
            
        # Potencia de carga
        load_mask = df['signal_name'].str.contains('Load Power', case=False, na=False)
        if load_mask.any():
            df_load = df[load_mask][['save_time', 'value']].copy()
            df_load.set_index('save_time', inplace=True)
            df_load_daily = df_load.resample('d')['value'].max().diff().reset_index()
            df_load_daily.columns = ['date', 'daily_consumption_kwh']
            df_load_daily['daily_consumption_kwh'] = df_load_daily['daily_consumption_kwh'].clip(lower=0)
            df_load_daily['date'] = df_load_daily['date'].dt.strftime('%Y-%m-%d')
            result['daily_load'] = df_load_daily

    return result

def clean_dc_load_consumption(df):
    """
    Limpia y valida el DataFrame de consumo DC desde Excel.
    Filtra filas sin fecha válida, convierte columnas numéricas y calcula kWh/día.
    """
    if df is None or df.empty:
        return pd.DataFrame()
        
    df = df.copy()
    
    # Asegurar columnas requeridas
    required = ['Date', 'Location', 'Site', 'Supply Mode']
    for col in required:
        if col not in df.columns:
            _log.warning(f"clean_dc_load_consumption: columna '{col}' no encontrada.")
            return pd.DataFrame()
            
    # Convertir columnas numéricas
    numeric_cols = [
        'Max Total Current(A)', 'Min Total Current(A)', 'Avg Total Current(A)',
        'Max Total Power(kW)', 'Min Total Power(kW)', 'Avg Total Power(kW)'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
    # Filtrar fechas válidas YYYY-MM-DD
    df['Date'] = df['Date'].astype(str).str.strip()
    mask_date = df['Date'].str.match(r'^\d{4}-\d{2}-\d{2}$')
    df = df[mask_date].copy()
    
    # Calcular consumo kWh diario aproximado: Avg Power kW * 24 horas
    if 'Avg Total Power(kW)' in df.columns:
        df['consumption_kwh'] = df['Avg Total Power(kW)'] * 24.0
    else:
        df['consumption_kwh'] = 0.0
        
    return df
