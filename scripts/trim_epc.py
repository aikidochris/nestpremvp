import pandas as pd
import os

BASE_DIR = r"C:\dev\nestpremvp\data"

# TODO: change these names to match your actual files
sources = [
    ("Gateshead_certificates.csv",  "Gateshead_certificates_trimmed.csv"),
    ("Newcastle_certificates.csv",  "Newcastle_certificates_trimmed.csv"),
    ("South_Tyneside_certificates.csv", "South_Tyneside_certificates_trimmed.csv"),
    ("Durham_certificates.csv",     "Durham_certificates_trimmed.csv"),
]

# Columns we care about
cols = [
    "POSTCODE",
    "ADDRESS1",
    "ADDRESS2",
    "POSTTOWN",
    "PROPERTY_TYPE",
    "TOTAL_FLOOR_AREA",
]

for src, dst in sources:
    src_path = os.path.join(BASE_DIR, src)
    dst_path = os.path.join(BASE_DIR, dst)

    if not os.path.exists(src_path):
        print(f"Skipping {src_path} (file not found)")
        continue

    print(f"Loading {src_path}...")
    df = pd.read_csv(src_path)

    # Make sure all expected columns exist
    missing = [c for c in cols if c not in df.columns]
    if missing:
        print(f"  !! Missing columns in {src}: {missing}")
        continue

    trimmed = df[cols].copy()
    print(f"  Writing trimmed file to {dst_path} (rows: {len(trimmed)})")
    trimmed.to_csv(dst_path, index=False)

print("Done.")
