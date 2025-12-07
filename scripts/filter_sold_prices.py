import csv
import os

# CONFIG
INPUT_FILE = r"data/pp-complete.csv"  # The 5GB file
OUTPUT_FILE = r"data/sold_prices_ne.csv" # The small file we want
TARGET_PREFIXES = ["NE25", "NE26", "NE27", "NE28", "NE29", "NE30"]

print(f"Reading huge file: {INPUT_FILE}...")
print(f"Filtering for: {TARGET_PREFIXES}")

count = 0
match_count = 0

with open(INPUT_FILE, "r", encoding="utf-8", errors="ignore") as f_in, \
     open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f_out:
    
    writer = csv.writer(f_out)
    reader = csv.reader(f_in)
    
    # Write our own header (Price Paid data often has no header)
    writer.writerow(["id", "price", "date", "postcode", "type", "old_new", "duration", "paon", "saon", "street", "locality", "city", "district", "county", "category", "status"])

    for row in reader:
        count += 1
        if count % 1000000 == 0:
            print(f"  Scanned {count} million rows...")

        # Postcode is usually column 3 (index 3)
        if len(row) > 3:
            postcode = row[3].upper().replace(" ", "")
            
            # Check if it starts with any of our targets
            if any(postcode.startswith(p) for p in TARGET_PREFIXES):
                writer.writerow(row)
                match_count += 1

print(f"Done! Found {match_count} sales in North Tyneside.")
print(f"Saved to: {OUTPUT_FILE}")