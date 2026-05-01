import os
from supabase import create_client, Client
from dotenv import load_dotenv
import io
import pandas as pd

# Cargar variables de entorno desde .env
load_dotenv()

def get_supabase_client() -> Client:
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Las credenciales de Supabase no están configuradas en las variables de entorno.")
        
    return create_client(url, key)

# Instancia global para usar en la app
try:
    supabase = get_supabase_client()
except Exception as e:
    supabase = None
    print(f"Error al inicializar Supabase: {e}")

def log_export_operation(user_email, project_name, report_type):
    """
    Registra una operación de exportación en la base de datos de Supabase.
    Asume que existe una tabla 'export_logs' con columnas: user_email, project_name, report_type
    """
    if supabase is None:
        print("Supabase no inicializado, omitiendo log.")
        return False
        
    try:
        data = {
            "user_email": user_email,
            "project_name": project_name,
            "report_type": report_type
        }
        response = supabase.table('export_logs').insert(data).execute()
        return True
    except Exception as e:
        print(f"Error al registrar log en Supabase: {e}")
        return False

def get_cached_project(project_id):
    """Verifica si el proyecto ya fue procesado y guardado en Supabase Storage."""
    if supabase is None:
        return None
    try:
        res = supabase.storage.from_("processed_projects").list()
        files = [f['name'] for f in res]
        
        solar_name = f"{project_id}_solar.parquet"
        history_name = f"{project_id}_history.parquet"
        
        if solar_name in files and history_name in files:
            solar_bytes = supabase.storage.from_("processed_projects").download(solar_name)
            history_bytes = supabase.storage.from_("processed_projects").download(history_name)
            
            df_solar = pd.read_parquet(io.BytesIO(solar_bytes))
            df_history = pd.read_parquet(io.BytesIO(history_bytes))
            
            return {'solar_work_rec': df_solar, 'history_data': df_history}
    except Exception as e:
        print(f"No se pudo cargar la caché de Supabase: {e}")
    return None

def save_project_to_cache(project_id, dataframes):
    """Guarda el proyecto en Supabase Storage como archivos .parquet para acceso rápido."""
    if supabase is None:
        return
    try:
        if 'solar_work_rec' in dataframes:
            buf = io.BytesIO()
            dataframes['solar_work_rec'].to_parquet(buf)
            supabase.storage.from_("processed_projects").upload(
                file=buf.getvalue(),
                path=f"{project_id}_solar.parquet",
                file_options={"content-type": "application/octet-stream", "upsert": "true"}
            )
            
        if 'history_data' in dataframes:
            buf = io.BytesIO()
            dataframes['history_data'].to_parquet(buf)
            supabase.storage.from_("processed_projects").upload(
                file=buf.getvalue(),
                path=f"{project_id}_history.parquet",
                file_options={"content-type": "application/octet-stream", "upsert": "true"}
            )
    except Exception as e:
        print(f"Error al guardar en caché: {e}")
