import pandas as pd
import numpy as np
from sklearn.neighbors import BallTree
import os

# ===== PATHS =====
BASE_DIR = r"C:\dev\nestpremvp"
PROP_CSV = os.path.join(BASE_DIR, "data", "properties_raw.csv")
PC_CSV = os.path.join(BASE_DIR, "data", "ukpostcodes.csv")
OUT_CSV = os.path.join(BASE_DIR, "data", "property_postcodes.csv")

print("Loading data...")
props = pd.read_csv(PROP_CSV)
pcs = pd.read_csv(PC_CSV)

# Normalise possible column names
props.rename(columns={
    "latitude": "lat",
    "longitude": "lon"
}, inplace=True)

pcs.rename(columns={
    "Latitude": "latitude",
    "Longitude": "longitude",
    "Postcode": "postcode"
}, inplace=True)

# Drop rows missing coords
props = props.dropna(subset=["lat", "lon"])
pcs = pcs.dropna(subset=["latitude", "longitude"])

# Convert to radians for BallTree (Haversine)
prop_coords = np.radians(np.c_[props["lat"].values, props["lon"].values])
pc_coords = np.radians(np.c_[pcs["latitude"].values, pcs["longitude"].values])

print("Building BallTree...")
tree = BallTree(pc_coords, metric="haversine")

print("Querying nearest postcode for each property...")
dist, idx = tree.query(prop_coords, k=1)

# Convert haversine distance to metres
dist_m = dist[:, 0] * 6371000.0  # Earth radius in metres

nearest_pcs = pcs.iloc[idx[:, 0]].reset_index(drop=True)

result = pd.DataFrame({
    "property_id": props["id"].values,
    "postcode": nearest_pcs["postcode"].values,
    "distance_m": dist_m
})

# If the postcode is absurdly far (e.g. >500m), blank it
result.loc[result["distance_m"] > 500, "postcode"] = None

print("Saving output:", OUT_CSV)
result.to_csv(OUT_CSV, index=False)
print("Done. Rows:", len(result))
