import pandas as pd
import numpy as np

df = pd.DataFrame({
    'a': [1, np.nan, 3],
    'b': ['x', 'y', np.nan]
})
print("Original:\n", df)
try:
    d = df.replace({np.nan: None}).to_dict(orient="records")
    print("\nResult:\n", d)
except Exception as e:
    print("Error:", e)
