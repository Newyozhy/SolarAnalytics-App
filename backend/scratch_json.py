import pandas as pd
import numpy as np
import json

df = pd.DataFrame({
    'a': [1, np.nan, 3],
    'b': ['x', 'y', np.nan],
    'time': pd.to_datetime(['2023-01-01', 'NaT', '2023-01-03'])
})

try:
    s = df.to_json(orient='records', date_format='iso')
    d = json.loads(s)
    print("Result:", d)
except Exception as e:
    print("Error:", e)
