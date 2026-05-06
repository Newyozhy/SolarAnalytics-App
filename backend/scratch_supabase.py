import os
import httpx
import json

url = "https://gdahzpiydxlkzrowihlz.supabase.co/rest/v1/processed_projects"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkYWh6cGl5ZHhsa3pyb3dpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTgxMjUsImV4cCI6MjA5MzE3NDEyNX0.Ibv8kqG-72_YvRxcAVQbbiJZTdEB2bqQI9a7qH8YekY"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

resp = httpx.get(f"{url}?select=folder_id,folder_name,processed_at&limit=5", headers=headers)
print("Recientes:", resp.json())

if resp.json():
    # Fetch first project's result_json
    fid = resp.json()[0]['folder_id']
    print(f"Fetching result_json for {fid}")
    res = httpx.get(f"{url}?folder_id=eq.{fid}&select=result_json", headers=headers)
    data = res.json()
    if data:
        rj = data[0]['result_json']
        if rj:
            size_mb = len(json.dumps(rj)) / (1024*1024)
            print(f"Size of result_json: {size_mb:.2f} MB")
            if "raw_data" in rj:
                rd = rj["raw_data"]
                print("raw_data keys:", rd.keys())
                for k, v in rd.items():
                    print(f"  {k} rows:", len(v) if isinstance(v, list) else type(v))
            else:
                print("No raw_data in result_json")
