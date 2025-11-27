/**
 * Script to import building footprints from OpenStreetMap (via Overpass)
 * into the public.properties table for the Tyneside area.
 *
 * Run with:
 *   npx ts-node scripts/import_osm_properties.ts
 * (Ensure SUPABASE_SERVICE_ROLE and NEXT_PUBLIC_SUPABASE_URL are set in your env.)
 */

import { createSupabaseAdminClient } from '../src/lib/supabaseAdmin.js'

type OverpassNode = {
  type: 'node'
  id: number
  lat: number
  lon: number
}

type OverpassWay = {
  type: 'way'
  id: number
  nodes: number[]
  tags?: Record<string, string>
}

type OverpassElement = OverpassNode | OverpassWay | { type: string; id: number; [key: string]: any }

type PropertyInsert = {
  osm_id: number | null
  postcode: string | null
  street: string | null
  house_number: string | null
  lat: number
  lon: number
  display_label: string | null
  price_estimate?: number | null
  uprn?: string | null
  updated_at?: string
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const BBOX = {
  minLat: 54.9,
  maxLat: 55.05,
  minLon: -1.75,
  maxLon: -1.5,
}

const QUERY = `
[out:json][timeout:60];
(
  way["building"](${BBOX.minLat},${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon});
  relation["building"](${BBOX.minLat},${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon});
);
out body;
>;
out skel qt;
`

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

function buildDisplayLabel(houseNumber?: string, street?: string, postcode?: string | null) {
  if (houseNumber && street) {
    return `${houseNumber} ${street}${postcode ? `, ${postcode}` : ''}`
  }
  if (street) {
    return `Home near ${street}${postcode ? `, ${postcode}` : ''}`
  }
  return `Home in Tyneside${postcode ? `, ${postcode}` : ''}`
}

async function fetchOverpassData(): Promise<{ nodes: Map<number, OverpassNode>; ways: OverpassWay[] }> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(QUERY)}`,
  })

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as { elements: OverpassElement[] }
  const nodes = new Map<number, OverpassNode>()
  const ways: OverpassWay[] = []

  for (const el of json.elements) {
    if (el.type === 'node') {
      const node = el as OverpassNode
      nodes.set(node.id, node)
    } else if (el.type === 'way' && (el as OverpassWay).tags?.building) {
      ways.push(el as OverpassWay)
    }
  }

  return { nodes, ways }
}

function computeCentroid(nodeIds: number[], nodeMap: Map<number, OverpassNode>): { lat: number; lon: number } | null {
  const coords: { lat: number; lon: number }[] = []
  for (const id of nodeIds) {
    const node = nodeMap.get(id)
    if (node) {
      coords.push({ lat: node.lat, lon: node.lon })
    }
  }
  if (coords.length < 3) return null
  const sum = coords.reduce(
    (acc, cur) => ({ lat: acc.lat + cur.lat, lon: acc.lon + cur.lon }),
    { lat: 0, lon: 0 }
  )
  return { lat: sum.lat / coords.length, lon: sum.lon / coords.length }
}

async function upsertProperties(rows: PropertyInsert[], batchSize = 300) {
  const supabase = createSupabaseAdminClient()
  const batches = chunk(rows, batchSize)

  for (const batch of batches) {
    const { error } = await supabase
      .from('properties')
      .upsert(batch as any, { onConflict: 'osm_id', ignoreDuplicates: false })
      .select()

    if (error) {
      console.error('Error upserting batch:', error)
      process.exit(1)
    }

    console.log(`Upserted batch of ${batch.length}`)
  }
}

async function main() {
  console.log('Starting OSM import for Tyneside…')

  const { nodes, ways } = await fetchOverpassData()
  console.log(`Fetched ${ways.length} building ways from Overpass`)

  const inserts: PropertyInsert[] = []

  for (const way of ways) {
    const centroid = computeCentroid(way.nodes, nodes)
    if (!centroid) continue

    const tags = way.tags ?? {}
    const houseNumber = tags['addr:housenumber']
    const street = tags['addr:street']
    const postcode = tags['addr:postcode']

    inserts.push({
      osm_id: way.id,
      uprn: null,
      postcode: postcode ?? null,
      street: street ?? null,
      house_number: houseNumber ?? null,
      lat: centroid.lat,
      lon: centroid.lon,
      display_label: buildDisplayLabel(houseNumber, street, postcode ?? null),
      price_estimate: null,
      updated_at: new Date().toISOString(),
    })
  }

  console.log(`Prepared ${inserts.length} property rows for upsert`)

  if (!inserts.length) {
    console.log('No rows to upsert. Exiting.')
    return
  }

  await upsertProperties(inserts)
  console.log('Import completed.')
}

main().catch((err) => {
  console.error('Unexpected error during import:', err)
  process.exit(1)
})
