import os
from supabase import create_client, Client
from dotenv import load_dotenv

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
