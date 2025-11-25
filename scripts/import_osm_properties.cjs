// scripts/import_osm_properties.cjs
// Import building footprints from OpenStreetMap (Overpass) into public.properties
// Run with:
//   npm run import:osm
// Assumes .env.local contains:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE=...

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local'),
});

const { createClient } = require('@supabase/supabase-js');

// Use global fetch if available (Node 18+), otherwise fall back to node-fetch
const fetchFn =
  global.fetch || ((...args) => import('node-fetch').then((m) => m.default(...args)));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const BBOX = {
  minLat: 54.9,   // a bit south of the Tyne
  maxLat: 55.1,   // a bit north of Whitley Bay / North Shields
  minLon: -1.9,   // west towards Gateshead/Metrocentre side
  maxLon: -1.3,   // east into the coast / North Sea
};

// Tunables
const BATCH_SIZE = 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000; // 1s, doubled each retry
const BETWEEN_BATCH_DELAY_MS = 100; // 0.1s between batches

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOverpassQuery() {
  const { minLat, maxLat, minLon, maxLon } = BBOX;
  return `
[out:json][timeout:60];
(
  way["building"](${minLat},${minLon},${maxLat},${maxLon});
);
out body;
>;
out skel qt;
`.trim();
}

function computeCentroid(points) {
  if (!points.length) return null;
  let sumLat = 0;
  let sumLon = 0;
  for (const p of points) {
    sumLat += p.lat;
    sumLon += p.lon;
  }
  return {
    lat: sumLat / points.length,
    lon: sumLon / points.length,
  };
}

function buildDisplayLabel(houseNumber, street, postcode) {
  const pc = postcode || null;

  if (houseNumber && street) {
    return pc ? `${houseNumber} ${street}, ${pc}` : `${houseNumber} ${street}`;
  }

  if (street) {
    return pc ? `Home near ${street}, ${pc}` : `Home near ${street}`;
  }

  if (pc) {
    return `Home in ${pc}`;
  }

  return 'Home in Tyneside';
}

async function fetchOverpassData() {
  console.log('Starting OSM import for Tyneside…');
  const query = buildOverpassQuery();

  const res = await fetchFn('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Overpass error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json;
}

function buildPropertiesFromOverpass(json) {
  const elements = json.elements || [];

  const nodeMap = new Map();
  for (const el of elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  const rows = [];
  let buildingCount = 0;

  for (const el of elements) {
    if (el.type !== 'way') continue;
    if (!el.tags || !el.tags.building) continue;

    buildingCount++;

    const coords = [];
    for (const nodeId of el.nodes || []) {
      const pt = nodeMap.get(nodeId);
      if (pt) coords.push(pt);
    }

    const centroid = computeCentroid(coords);
    if (!centroid) continue;

    const tags = el.tags || {};
    const name = tags.name || null;
    const place = tags['addr:place'] || null;
    const houseNumber = tags['addr:housenumber'] || null;
    let street = tags['addr:street'] || null;
    const postcode = tags['addr:postcode'] || null;

    if (!street && place) {
      street = place;
    }

    const row = {
      osm_id: el.id,
      postcode,
      street,
      house_number: houseNumber,
      lat: centroid.lat,
      lon: centroid.lon,
      display_label: buildDisplayLabel(houseNumber, street, postcode),
      price_estimate: null,
      uprn: null,
      updated_at: new Date().toISOString(),
    };

    rows.push(row);
  }

  console.log(`Found ${buildingCount} building ways`);
  console.log(`Built ${rows.length} rows to upsert`);
  return rows;
}

async function upsertBatchWithRetry(batch, batchIndex, totalBatches) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      console.log(
        `Upserting batch ${batchIndex + 1}/${totalBatches} (${batch.length} rows), attempt ${attempt}…`
      );

      const { error } = await supabase
        .from('properties')
        .upsert(batch, { onConflict: 'osm_id', ignoreDuplicates: false });

      if (error) {
        console.error('Supabase upsert error:', error);
        if (attempt >= MAX_RETRIES) {
          throw new Error(
            `Batch ${batchIndex + 1} failed after ${MAX_RETRIES} attempts: ${error.message}`
          );
        }

        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying batch ${batchIndex + 1} after ${delay} ms…`);
        await sleep(delay);
        continue;
      }

      // Success
      return;
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        console.error(`Giving up on batch ${batchIndex + 1}:`, err);
        throw err;
      }
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Error in batch ${batchIndex + 1}, retrying after ${delay} ms…`);
      await sleep(delay);
    }
  }
}

async function upsertInBatches(rows) {
  const total = rows.length;
  const totalBatches = Math.ceil(total / BATCH_SIZE);

  console.log(
    `Upserting ${total} rows into public.properties in ${totalBatches} batches of ${BATCH_SIZE}…`
  );

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batchIndex = i / BATCH_SIZE;
    const batch = rows.slice(i, i + BATCH_SIZE);

    await upsertBatchWithRetry(batch, batchIndex, totalBatches);

    if (i + BATCH_SIZE < total) {
      await sleep(BETWEEN_BATCH_DELAY_MS);
    }
  }
}

async function main() {
  try {
    const overpassJson = await fetchOverpassData();
    const rows = buildPropertiesFromOverpass(overpassJson);

    if (!rows.length) {
      console.log('No rows built from Overpass response. Nothing to import.');
      return;
    }

    await upsertInBatches(rows);
    console.log('OSM import complete.');
  } catch (err) {
    console.error('Import failed:', err);
    process.exitCode = 1;
  }
}

main();
