import pandas as pd
import numpy as np

# Create mock data
dates = pd.date_range("2023-01-01", "2023-01-03", freq="1min")
df = pd.DataFrame({
    "save_time": dates,
    "device_name": ["Device_1"] * len(dates),
    "signal_name": ["SOC"] * len(dates),
    "value": np.random.rand(len(dates)) * 100
})

print("Original rows:", len(df))

# Resample to hourly
df['save_time'] = pd.to_datetime(df['save_time'])
df['value'] = pd.to_numeric(df['value'], errors='coerce')

df_hourly = df.groupby(['device_name', 'signal_name']).resample('1H', on='save_time')['value'].mean().reset_index()
print("Hourly rows:", len(df_hourly))
print(df_hourly.head())
