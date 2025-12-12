-- Up Migration
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
    -- 1. New Claims
    SELECT
      pc.id::text as event_id,
      'CLAIM' as type,
      pc.property_id,
      pc.created_at,
      'New owner claimed ' || COALESCE(p.street, 'a property') as summary_text,
      p.lat, p.lon, p.street, p.house_number, p.market_image_url, p.geom
    FROM property_claims pc
    JOIN properties p ON pc.property_id = p.id
    WHERE pc.status = 'approved'
      AND pc.created_at > now() - interval '30 days'

    UNION ALL

    -- 2. New Stories
    SELECT
      hs.id::text as event_id,
      'STORY' as type,
      hs.property_id,
      hs.created_at,
      COALESCE(hs.summary_text, 'New story added to ' || COALESCE(p.street, 'a property')) as summary_text,
      p.lat, p.lon, p.street, p.house_number, p.market_image_url, p.geom
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
      p.lat, p.lon, p.street, p.house_number, p.market_image_url, p.geom
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
    (p_lat IS NULL OR st_dwithin(e.geom::geography, st_point(p_lon, p_lat)::geography, p_radius_meters))
  ORDER BY e.created_at DESC
  LIMIT 50;
END;
$$;
