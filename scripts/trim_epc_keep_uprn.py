import pandas as pd
import os

# --- CHANGE THESE TWO PER AREA FILE ---
INPUT_CSV = r"C:\dev\nestpremvp\data\epc_newcastle_full.csv"
OUTPUT_CSV = r"C:\dev\nestpremvp\data\epc_newcastle_trimmed_uprn.csv"
# --------------------------------------

CHUNK_SIZE = 200_000

# columns we actually want to keep
KEEP_COLS = [
    "UPRN",
    "POSTCODE",
    "ADDRESS1",
    "ADDRESS2",
    "POSTTOWN",
    "PROPERTY_TYPE",
    "TOTAL_FLOOR_AREA",
    "CONSTRUCTION_AGE_BAND",
    "LODGEMENT_DATETIME",
]

def main():
    if not os.path.exists(INPUT_CSV):
        print("Input not found:", INPUT_CSV)
        return

    first = True
    total = 0

    for chunk in pd.read_csv(INPUT_CSV, chunksize=CHUNK_SIZE, low_memory=False):
        if first:
            print("Columns in source:", list(chunk.columns))

        # keep only the columns we care about (ignore extras)
        sub = chunk[KEEP_COLS].copy()

        mode = "w" if first else "a"
        sub.to_csv(OUTPUT_CSV, mode=mode, index=False, header=first)

        total += len(sub)
        first = False

    print(f"Done. Wrote {total} rows to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
