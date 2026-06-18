import pandas as pd
import os

def main():
    coca_cola_path = os.path.join("Coca Cola Updated", "history_data.csv")
    if os.path.exists(coca_cola_path):
        df = pd.read_csv(coca_cola_path, nrows=5)
        print("Columns:", df.columns.tolist())
        print("First 5 rows:")
        print(df.to_dict(orient='records'))
        
        # Let's read some unique values of 'sid'
        df_full = pd.read_csv(coca_cola_path, usecols=['sid'])
        print("\nUnique sid values in Coca Cola:", df_full['sid'].unique().tolist())
    else:
        print("Coca Cola Updated/history_data.csv does not exist.")

if __name__ == "__main__":
    main()
