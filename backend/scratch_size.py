import traceback
import pandas as pd
from app.services.drive_service import get_drive_service, get_csv_files_in_project, download_csv_to_dataframe

try:
    service = get_drive_service()
    files = service.files().list(q="mimeType='application/vnd.google-apps.folder'", spaces='drive', fields='files(id, name)').execute().get('files', [])
    folder_id = files[0]['id']
    print(f"Folder name: {files[0]['name']}")
    
    csvs = get_csv_files_in_project(service, folder_id)
    for f in csvs:
        if 'history_data' in f['name'].lower():
            df = download_csv_to_dataframe(service, f['id'])
            print(f'History data rows: {len(df)}')
            s = df.to_json(orient='records')
            print(f'Size in MB: {len(s) / 1024 / 1024:.2f} MB')
            break
except Exception as e:
    traceback.print_exc()
