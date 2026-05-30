import pandas as pd
import os, json
from datetime import datetime
try:
    from zenml import step
except ImportError:
    step = lambda f: f  # no-op decorator when ZenML not available

@step
def ingest_bronze(raw_dir: str, bronze_dir: str) -> dict:
    """Ingests ALL raw CSVs into the Bronze layer."""
    
    files_to_ingest = {
        "transactions": "transactions_history_final.csv",
        "outlet_master": "outlet_master.csv",
        "coordinates": "outlet_coordinates.csv", # Added this!
        "seasonality": "distributor_seasonality_details.csv",
        "holidays": "holiday_list.csv"
    }
    
    row_counts = {}
    
    os.makedirs(bronze_dir, exist_ok=True)
    manifest = {"ingested_at": datetime.now().isoformat(), "files": {}}

    for key, filename in files_to_ingest.items():
        file_path = os.path.join(raw_dir, filename)
        
        if not os.path.exists(file_path):
            print(f"[WARN] {filename} not found in {raw_dir}. Skipping.")
            manifest["files"][key] = {"source_file": filename, "status": "missing"}
            continue
            
        df = pd.read_csv(file_path)
        out_path = os.path.join(bronze_dir, f"{key}.parquet")
        df.to_parquet(out_path, index=False)

        manifest["files"][key] = {
            "source_file": filename,
            "row_count_raw": len(df),
            "columns": list(df.columns),
            "schema": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "null_counts": {col: int(df[col].isnull().sum()) for col in df.columns},
            "status": "ingested"
        }
        row_counts[key] = len(df)
        print(f"[Bronze] Ingested {key}: {len(df)} rows.")
        
    manifest_path = os.path.join(bronze_dir, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"[Bronze] Manifest written to {manifest_path}")
    return row_counts


if __name__ == "__main__":
    import yaml
    with open("params.yaml") as f:
        params = yaml.safe_load(f)
    ingest_bronze(params['data']['raw_dir'], params['data']['bronze_dir'])