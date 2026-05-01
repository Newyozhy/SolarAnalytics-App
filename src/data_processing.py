import pandas as pd
import numpy as np

def clean_solar_work_rec(df):
    """
    Limpia y procesa el DataFrame de solar_work_rec.csv.
    Calcula la generación neta de energía por sesión y por día.
    """
    if df is None or df.empty:
        return pd.DataFrame()
        
    df = df.copy()
    
    # Asegurar que los nombres de columnas coincidan o sean manejables
    # Nombres esperados: start_time, end_time, Solar Energy:PV Work Duration(Min), Solar Energy:PV Initial Power Generation(kWh), Solar Energy:PV Final Power Generation(kWh)
    
    # Estandarizar nombres de columnas a minúsculas y sin espacios problemáticos para fácil acceso
    col_mapping = {}
    for col in df.columns:
        if 'start_time' in col.lower():
            col_mapping[col] = 'start_time'
        elif 'end_time' in col.lower():
            col_mapping[col] = 'end_time'
        elif 'duration' in col.lower():
            col_mapping[col] = 'duration_min'
        elif 'initial' in col.lower():
            col_mapping[col] = 'initial_kwh'
        elif 'final' in col.lower():
            col_mapping[col] = 'final_kwh'
            
    df = df.rename(columns=col_mapping)
    
    # Convertir a datetime
    df['start_time'] = pd.to_datetime(df['start_time'], errors='coerce')
    df['end_time'] = pd.to_datetime(df['end_time'], errors='coerce')
    
    # Asegurar numéricos
    for col in ['duration_min', 'initial_kwh', 'final_kwh']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Calcular generación neta por sesión
    if 'initial_kwh' in df.columns and 'final_kwh' in df.columns:
        df['net_generation_kwh'] = df['final_kwh'] - df['initial_kwh']
        # Evitar valores negativos por reinicios
        df['net_generation_kwh'] = df['net_generation_kwh'].apply(lambda x: max(0, x))
    else:
        df['net_generation_kwh'] = 0
        
    # Extraer solo la fecha para agrupaciones diarias
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
    
    # Ordenar por fecha
    daily_df = daily_df.sort_values('date')
    return daily_df

def clean_history_data(df):
    """
    Limpia y filtra history_data.csv para obtener métricas clave.
    Devuelve un diccionario con dataframes separados para facilitar gráficos.
    Debido al volumen de datos, optimizamos filtrando solo lo esencial.
    """
    if df is None or df.empty:
        return {}
        
    df = df.copy()
    
    # Convertir tiempo
    if 'save_time' in df.columns:
        df['save_time'] = pd.to_datetime(df['save_time'], errors='coerce')
    
    if 'value' in df.columns:
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        
    result = {}
    
    # Filtrar SOC de batería
    if 'signal_name' in df.columns:
        # SOC de baterías
        soc_mask = df['signal_name'].str.contains('SOC', case=False, na=False)
        if soc_mask.any():
            df_soc = df[soc_mask][['save_time', 'device_name', 'signal_name', 'value']].copy()
            # Agrupar por hora para reducir puntos en la gráfica si es muy grande
            df_soc.set_index('save_time', inplace=True)
            df_soc_hourly = df_soc.groupby(['device_name', pd.Grouper(freq='H')])['value'].mean().reset_index()
            result['battery_soc'] = df_soc_hourly
            
        # Potencia de carga
        load_mask = df['signal_name'].str.contains('Load Power', case=False, na=False)
        if load_mask.any():
            df_load = df[load_mask][['save_time', 'value']].copy()
            df_load.set_index('save_time', inplace=True)
            # Resample a diario para sumar
            df_load_daily = df_load.resample('D')['value'].max().diff().reset_index() # max() de la acumulada
            df_load_daily.columns = ['date', 'daily_consumption_kwh']
            df_load_daily['daily_consumption_kwh'] = df_load_daily['daily_consumption_kwh'].apply(lambda x: max(0, x))
            result['daily_load'] = df_load_daily

    return result
