import os
import io
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
from fastapi import HTTPException

SCOPES = ['https://www.googleapis.com/auth/drive']

def get_drive_service():
    """Autentica y retorna el servicio de Google Drive."""
    # En FastAPI, usaremos variables de entorno nativas en lugar de st.secrets
    creds_path = os.environ.get('GOOGLE_CREDENTIALS_JSON_PATH', 'solarapp-drive-5a7a621a3732.json')
    
    if not os.path.exists(creds_path):
        # Intentar buscar en el directorio padre por si se ejecuta desde backend/
        parent_path = os.path.join("..", creds_path)
        if os.path.exists(parent_path):
            creds_path = parent_path
        else:
            raise HTTPException(status_code=500, detail=f"No se encontró el archivo de credenciales de Google Drive en {creds_path}")
        
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

def get_folder_metadata(service, folder_id):
    """Obtiene el id y nombre de una carpeta específica."""
    try:
        return service.files().get(fileId=folder_id, fields="id, name").execute()
    except Exception as e:
        return None

def list_subfolders(service, folder_id):
    """Lista todas las subcarpetas dentro de una carpeta padre (folder_id)."""
    query = f"mimeType='application/vnd.google-apps.folder' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="nextPageToken, files(id, name)").execute()
    
    # Ordenar alfabéticamente
    files = results.get('files', [])
    return sorted(files, key=lambda x: x['name'])

def get_csv_files_in_project(service, project_folder_id):
    """Busca los CSVs relevantes en la carpeta del proyecto."""
    query = f"mimeType='text/csv' and '{project_folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="nextPageToken, files(id, name)").execute()
    csv_files = results.get('files', [])
    
    if not csv_files:
        folder_query = f"mimeType='application/vnd.google-apps.folder' and '{project_folder_id}' in parents and trashed=false"
        subfolders = service.files().list(q=folder_query, fields="files(id, name)").execute().get('files', [])
        for subf in subfolders:
            sub_query = f"mimeType='text/csv' and '{subf['id']}' in parents and trashed=false"
            sub_results = service.files().list(q=sub_query, fields="files(id, name)").execute()
            csv_files.extend(sub_results.get('files', []))
            
    relevant_names = ['solar_work_rec.csv', 'history_data.csv', 'batt_chg_rec.csv', 'batt_dischg_rec.csv', 'history_alarm.csv']
    filtered_files = [f for f in csv_files if f['name'] in relevant_names]
    
    return filtered_files

def download_csv_to_dataframe(service, file_id):
    """Descarga un archivo CSV desde Drive directamente a un DataFrame de Pandas usando PyArrow para optimizar memoria."""
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
    
    fh.seek(0)
    try:
        # MITIGACIÓN: Usar engine='pyarrow' para reducir memoria y aumentar velocidad
        df = pd.read_csv(fh, engine='pyarrow')
    except Exception:
        fh.seek(0)
        # Fallback a motor estándar con otro encoding
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
        name_key = file_info['name'].replace('.csv', '')
        dataframes[name_key] = df
        
    return dataframes

def upload_file_to_drive(service, file_path, folder_id, file_name=None):
    """Sube un archivo local a una carpeta específica en Google Drive."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No se encontró el archivo {file_path}")
        
    if not file_name:
        file_name = os.path.basename(file_path)
        
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
