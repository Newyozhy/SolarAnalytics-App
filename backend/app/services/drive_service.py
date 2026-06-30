import os
import io
import pathlib
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
from fastapi import HTTPException

SCOPES = ['https://www.googleapis.com/auth/drive']

# Ruta absoluta a la raíz del proyecto (SolarApp/)
_PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[4]

__all__ = [
    'get_drive_service', 
    'find_folder_id', 
    'get_folder_metadata',
    'list_subfolders', 
    'get_csv_files_in_project',
    'download_csv_to_dataframe',
    'download_project_data',
    'upload_file_to_drive',
    'get_excel_files_in_project',
    'download_excel_to_dataframe',
    'detect_folder_type',
    'download_merged_project_data',
]


def get_drive_service():
    """Autentica y retorna el servicio de Google Drive."""
    # Nombre del archivo de credenciales (desde .env o fallback)
    creds_filename = os.environ.get(
        'GOOGLE_CREDENTIALS_JSON_PATH',
        'solarapp-drive-5a7a621a3732.json'
    )

    # Buscar en orden: ruta absoluta → project_root/filename → CWD → CWD/../
    candidates = [
        pathlib.Path(creds_filename),                    # si es ruta absoluta
        _PROJECT_ROOT / creds_filename,                  # SolarApp/filename
        pathlib.Path.cwd() / creds_filename,             # CWD/filename
        pathlib.Path.cwd().parent / creds_filename,      # CWD/../filename
    ]

    creds_path = None
    for candidate in candidates:
        if candidate.exists():
            creds_path = str(candidate)
            break

    if not creds_path:
        searched = '\n  '.join(str(c) for c in candidates)
        raise HTTPException(
            status_code=500,
            detail=f"No se encontró el archivo de credenciales. Buscado en:\n  {searched}"
        )

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
    """Descarga un archivo CSV desde Drive directamente a un DataFrame de Pandas."""
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()

    fh.seek(0)
    try:
        # Motor 'c' (estándar de pandas): menor peak de memoria que pyarrow
        df = pd.read_csv(fh, engine='c')
    except Exception:
        fh.seek(0)
        # Fallback con encoding latin-1
        df = pd.read_csv(fh, encoding='iso-8859-1')

    return df

def get_excel_files_in_project(service, project_folder_id):
    """Busca los archivos Excel relevantes en la carpeta del proyecto (o sus subcarpetas)."""
    query = f"(mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel') and '{project_folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="nextPageToken, files(id, name)").execute()
    excel_files = results.get('files', [])
    
    if not excel_files:
        folder_query = f"mimeType='application/vnd.google-apps.folder' and '{project_folder_id}' in parents and trashed=false"
        subfolders = service.files().list(q=folder_query, fields="files(id, name)").execute().get('files', [])
        for subf in subfolders:
            sub_query = f"(mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel') and '{subf['id']}' in parents and trashed=false"
            sub_results = service.files().list(q=sub_query, fields="files(id, name)").execute()
            excel_files.extend(sub_results.get('files', []))
            
    # Filtrar solo archivos con nombre que empiece o contenga 'DC Load Consumption'
    filtered = [f for f in excel_files if 'DC Load Consumption' in f['name']]
    return filtered

def download_excel_to_dataframe(service, file_id):
    """Descarga un archivo Excel desde Drive directamente a un DataFrame de Pandas."""
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()

    fh.seek(0)
    xl = pd.ExcelFile(fh, engine='openpyxl')
    df = xl.parse(xl.sheet_names[0])
    
    header_row = df.iloc[0]
    data_df = df.iloc[1:].copy()
    data_df.columns = header_row
    return data_df

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


# ─────────────────────────────────────────────────────────────
# DETECCIÓN DE TIPO DE CARPETA Y FUSIÓN DE SITIOS GLOBALES
# ─────────────────────────────────────────────────────────────

RELEVANT_CSV_NAMES = {'solar_work_rec.csv', 'history_data.csv', 'batt_chg_rec.csv', 'batt_dischg_rec.csv', 'history_alarm.csv'}

def detect_folder_type(service, folder_id: str) -> dict:
    """
    Detecta automáticamente si una carpeta es:
      - 'project'  : contiene CSVs directamente (proyecto individual)
      - 'site'     : contiene subcarpetas, cada una con CSVs (sitio global)
      - 'dc_load'  : contiene solo Excels de consumo DC
      - 'empty'    : sin datos relevantes

    Retorna:
    {
        'type': 'project' | 'site' | 'dc_load' | 'empty',
        'children': [{'id': ..., 'name': ...}, ...]  # solo si type == 'site'
    }
    """
    # 1. Verificar si tiene CSVs directos
    direct_csvs = get_csv_files_in_project.__wrapped__(service, folder_id) if hasattr(get_csv_files_in_project, '__wrapped__') else _list_direct_csvs(service, folder_id)
    if direct_csvs:
        return {'type': 'project', 'children': []}

    # 2. Verificar si tiene Excels de DC Load directos
    excel_query = (
        f"(mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' "
        f"or mimeType='application/vnd.ms-excel') "
        f"and '{folder_id}' in parents and trashed=false"
    )
    excel_res = service.files().list(q=excel_query, fields="files(id, name)").execute()
    excel_files = [f for f in excel_res.get('files', []) if 'DC Load Consumption' in f['name']]
    if excel_files:
        return {'type': 'dc_load', 'children': []}

    # 3. Verificar si tiene subcarpetas con CSVs dentro (sitio global)
    subfolders = list_subfolders(service, folder_id)
    site_children = []
    for subf in subfolders:
        sub_csvs = _list_direct_csvs(service, subf['id'])
        if sub_csvs:
            site_children.append({'id': subf['id'], 'name': subf['name']})

    if site_children:
        return {'type': 'site', 'children': site_children}

    return {'type': 'empty', 'children': []}


def _list_direct_csvs(service, folder_id: str) -> list:
    """Lista CSVs relevantes que están directamente en folder_id (sin recursión en subcarpetas)."""
    query = f"mimeType='text/csv' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    csv_files = results.get('files', [])
    return [f for f in csv_files if f['name'] in RELEVANT_CSV_NAMES]


def download_merged_project_data(service, parent_folder_id: str, children: list) -> dict:
    """
    Descarga y fusiona los CSVs de todas las subcarpetas (partes) de un sitio global.

    - Cada parte se procesa secuencialmente para bajo uso de memoria.
    - history_data se filtra por señales relevantes ANTES de acumular para
      evitar OOM en servidores con poca RAM (p.ej. con 4 partes * 200k filas).
    - Se añade columna 'source_part' a 'history_data' e 'history_alarm' para
      distinguir dispositivos de partes distintas sin perder trazabilidad.
    - Los DataFrames resultantes son idénticos en estructura a los que genera
      download_project_data(), por lo que el motor de análisis funciona sin cambios.

    Retorna:
        dict con claves: 'solar_work_rec', 'history_data', 'history_alarm' (si existen)
    """
    import gc
    import re as _re

    # Señales relevantes para el análisis (igual que el filtro en _process_merged_site_task)
    _SIGNAL_FILTER = _re.compile(
        r'SOC|SOH|Voltage|Load Power|Source Power|Total Generation|Temperature|SPCU',
        flags=_re.IGNORECASE
    )

    accumulators: dict[str, list] = {}

    for part in children:
        part_id = part['id']
        part_name = part['name']
        csv_files = _list_direct_csvs(service, part_id)

        # También buscar en subcarpetas de la parte (por compatibilidad con proyectos anidados)
        if not csv_files:
            sub_query = f"mimeType='application/vnd.google-apps.folder' and '{part_id}' in parents and trashed=false"
            sub_res = service.files().list(q=sub_query, fields="files(id, name)").execute()
            for subf in sub_res.get('files', []):
                sub_csvs = _list_direct_csvs(service, subf['id'])
                csv_files.extend(sub_csvs)

        for file_info in csv_files:
            df = download_csv_to_dataframe(service, file_info['id'])
            name_key = file_info['name'].replace('.csv', '')

            # ── Optimización de memoria: filtrar history_data por señales relevantes
            # ANTES de acumular, para no saturar la RAM con millones de filas brutas.
            if name_key == 'history_data' and 'signal_name' in df.columns:
                mask = df['signal_name'].str.contains(_SIGNAL_FILTER, na=False)
                df = df[mask].copy()

            # Añadir columna de trazabilidad a tablas de señales/alarmas
            if name_key in ('history_data', 'history_alarm'):
                df['source_part'] = part_name

            if name_key not in accumulators:
                accumulators[name_key] = []
            accumulators[name_key].append(df)
            del df
            gc.collect()

    if not accumulators:
        raise ValueError(
            f"No se encontraron archivos CSV relevantes en ninguna subcarpeta del sitio '{parent_folder_id}'."
        )

    # Concatenar acumuladores
    merged: dict = {}
    for name_key, frames in accumulators.items():
        if frames:
            merged[name_key] = pd.concat(frames, ignore_index=True)
        del frames
        gc.collect()

    return merged

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
