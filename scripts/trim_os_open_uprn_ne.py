import pandas as pd
import os

INPUT_CSV = r"C:\dev\nestpremvp\data\os_open_uprn_gb.csv"      # big OS file
OUTPUT_CSV = r"C:\dev\nestpremvp\data\os_open_uprn_ne.csv"  # trimmed NE file

# North East bounding box (approx)
MIN_LAT = 54.5
MAX_LAT = 55.3
MIN_LON = -2.2
MAX_LON = -1.1

CHUNK_SIZE = 200_000

KEEP_COLS = ["UPRN", "X_COORDINATE", "Y_COORDINATE", "LATITUDE", "LONGITUDE"]

def main():
    first_chunk = True
    total_kept = 0

    # header=0: first row is header, use the real names
    for chunk in pd.read_csv(INPUT_CSV, header=0, chunksize=CHUNK_SIZE, low_memory=False):
        if first_chunk:
            print("Columns detected:", list(chunk.columns))

        # convert lat/lon to numeric defensively
        lat = pd.to_numeric(chunk["LATITUDE"], errors="coerce")
        lon = pd.to_numeric(chunk["LONGITUDE"], errors="coerce")

        mask = (
            (lat >= MIN_LAT) &
            (lat <= MAX_LAT) &
            (lon >= MIN_LON) &
            (lon <= MAX_LON)
        )

        filtered = chunk.loc[mask, KEEP_COLS].copy()

        if filtered.empty:
            continue

        mode = "w" if first_chunk else "a"
        filtered.to_csv(
            OUTPUT_CSV,
            mode=mode,
            index=False,
            header=first_chunk,  # write header only once
        )

        total_kept += len(filtered)
        first_chunk = False

    print(f"Done. Kept {total_kept} rows into {OUTPUT_CSV!r}")

if __name__ == "__main__":
    main()
