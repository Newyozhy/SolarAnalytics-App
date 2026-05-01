import os
import io
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/drive']

def get_drive_service():
    """Autentica y retorna el servicio de Google Drive."""
    creds_path = os.environ.get('GOOGLE_CREDENTIALS_JSON_PATH', 'credentials.json')
    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"No se encontró el archivo de credenciales en la ruta: {creds_path}")
        
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES)
    service = build('drive', 'v3', credentials=creds)
    return service

def find_folder_id(service, folder_name, parent_id=None):
    """Busca una carpeta por nombre y retorna su ID."""
    query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
        
    results = service.files().list(q=query, fields="nextPageToken, files(id, name)").execute()
    items = results.get('files', [])
    
    if not items:
        return None
    return items[0]['id']

def list_projects(service, root_folder_name="Paneles Solares"):
    """Lista todas las subcarpetas (proyectos) dentro de la carpeta principal."""
    root_id = find_folder_id(service, root_folder_name)
    if not root_id:
        raise ValueError(f"No se encontró la carpeta raíz '{root_folder_name}' compartida con la cuenta de servicio.")
        
    query = f"mimeType='application/vnd.google-apps.folder' and '{root_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="nextPageToken, files(id, name)").execute()
    return results.get('files', [])

def get_csv_files_in_project(service, project_folder_id):
    """Busca los CSVs relevantes en la carpeta del proyecto (incluso si están en una subcarpeta de Reporte_Paneles)."""
    # Para simplificar, buscamos todos los CSVs que pertenezcan a este proyecto o sus subcarpetas.
    # En Drive API, buscar recursivamente es complejo con una sola query simple,
    # así que buscaremos todos los archivos .csv en el proyecto y filtraremos por nombre.
    
    # Primero buscamos si hay una subcarpeta de datos (algunos lo tienen suelto, otros en subcarpetas)
    query = f"mimeType='text/csv' and '{project_folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="nextPageToken, files(id, name)").execute()
    csv_files = results.get('files', [])
    
    # Si no hay CSVs directamente, buscamos las subcarpetas del proyecto e iteramos
    if not csv_files:
        folder_query = f"mimeType='application/vnd.google-apps.folder' and '{project_folder_id}' in parents and trashed=false"
        subfolders = service.files().list(q=folder_query, fields="files(id, name)").execute().get('files', [])
        for subf in subfolders:
            sub_query = f"mimeType='text/csv' and '{subf['id']}' in parents and trashed=false"
            sub_results = service.files().list(q=sub_query, fields="files(id, name)").execute()
            csv_files.extend(sub_results.get('files', []))
            
    # Filtramos solo los relevantes
    relevant_names = ['solar_work_rec.csv', 'history_data.csv', 'batt_chg_rec.csv', 'batt_dischg_rec.csv', 'history_alarm.csv']
    filtered_files = [f for f in csv_files if f['name'] in relevant_names]
    
    return filtered_files

def download_csv_to_dataframe(service, file_id):
    """Descarga un archivo CSV desde Drive directamente a un DataFrame de Pandas en RAM."""
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
    
    fh.seek(0)
    # Algunos CSV pueden venir con diferente encoding (utf-8 o iso-8859-1)
    try:
        df = pd.read_csv(fh, encoding='utf-8')
    except UnicodeDecodeError:
        fh.seek(0)
        df = pd.read_csv(fh, encoding='iso-8859-1')
        
    return df

def download_project_data(service, project_folder_id):
    """Descarga todos los CSVs relevantes de un proyecto y retorna un diccionario de DataFrames."""
    csv_files = get_csv_files_in_project(service, project_folder_id)
    
    if not csv_files:
        raise ValueError("No se encontraron archivos CSV relevantes en este proyecto.")
        
    dataframes = {}
    for file_info in csv_files:
        df = download_csv_to_dataframe(service, file_info['id'])
        # Quitar la extensión para usar de llave
        name_key = file_info['name'].replace('.csv', '')
        dataframes[name_key] = df
        
    return dataframes

def upload_file_to_drive(service, file_path, folder_id, file_name=None):
    """Sube un archivo local a una carpeta específica en Google Drive."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No se encontró el archivo {file_path}")
        
    if not file_name:
        file_name = os.path.basename(file_path)
        
    # Determinar el mimetype básico
    mime_type = 'application/octet-stream'
    if file_path.endswith('.xlsx'):
        mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif file_path.endswith('.pptx'):
        mime_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        
    file_metadata = {
        'name': file_name,
        'parents': [folder_id]
    }
    
    media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
    
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()
    
    return file.get('id')
