-- Fix Activity Feed RPC
-- Issue 1: property_claims.status = 'approved' but data uses 'claimed'
-- Issue 2: geom column is NULL, so st_dwithin fails. Use lat/lon directly.

DROP FUNCTION IF EXISTS get_activity_feed;

CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id uuid, 
  p_lat float DEFAULT NULL, 
  p_lon float DEFAULT NULL, 
  p_radius_meters float DEFAULT 5000 -- Default 5km
)
RETURNS TABLE (
  event_id text,
  type text,
  property_id uuid,
  created_at timestamptz,
  summary_text text,
  lat float,
  lon float,
  street text,
  house_number text,
  market_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH events AS (
    -- 1. New Claims (Accept both 'approved' and 'claimed' status)
    SELECT
      pc.id::text as event_id,
      'CLAIM' as type,
      pc.property_id,
      pc.created_at,
      'New owner claimed ' || COALESCE(p.street, 'a property') as summary_text,
      p.lat, p.lon, p.street, p.house_number, p.market_image_url
    FROM property_claims pc
    JOIN properties p ON pc.property_id = p.id
    WHERE pc.status IN ('approved', 'claimed')
      AND pc.created_at > now() - interval '30 days'

    UNION ALL

    -- 2. New Stories
    SELECT
      hs.id::text as event_id,
      'STORY' as type,
      hs.property_id,
      hs.created_at,
      COALESCE(hs.summary_text, 'New story added to ' || COALESCE(p.street, 'a property')) as summary_text,
      p.lat, p.lon, p.street, p.house_number, p.market_image_url
    FROM home_story hs
    JOIN properties p ON hs.property_id = p.id
    WHERE hs.created_at > now() - interval '30 days'

    UNION ALL

    -- 3. Status Changes
    SELECT
      ifl.id::text as event_id,
      'STATUS' as type,
      ifl.property_id,
      ifl.created_at,
      CASE
        WHEN ifl.is_for_sale IS TRUE THEN 'Listed for Sale'
        WHEN ifl.is_for_rent IS TRUE THEN 'Listed for Rent'
        WHEN ifl.soft_listing IS TRUE THEN 'Owner is Open to Talking'
        ELSE 'Status updated'
      END as summary_text,
      p.lat, p.lon, p.street, p.house_number, p.market_image_url
    FROM intent_flags ifl
    JOIN properties p ON ifl.property_id = p.id
    WHERE ifl.created_at > now() - interval '30 days'
      AND (ifl.is_for_sale IS TRUE OR ifl.is_for_rent IS TRUE OR ifl.soft_listing IS TRUE)
  )
  SELECT 
    e.event_id, e.type, e.property_id, e.created_at, e.summary_text,
    e.lat, e.lon, e.street, e.house_number, e.market_image_url
  FROM events e
  WHERE 
    -- Use haversine-like approximation with lat/lon since geom is NULL
    -- This approximates distance in degrees (rough: 1 deg lat ~ 111km)
    (p_lat IS NULL OR (
      sqrt(power(e.lat - p_lat, 2) + power((e.lon - p_lon) * cos(radians(p_lat)), 2)) * 111000 < p_radius_meters
    ))
  ORDER BY e.created_at DESC
  LIMIT 50;
END;
$$;
