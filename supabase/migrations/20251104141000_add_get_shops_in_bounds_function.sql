-- Create a new function to get shops within a bounding box
-- This is more efficient than radius-based queries for map views

CREATE OR REPLACE FUNCTION get_shops_in_bounds(
  sw_lat DECIMAL,
  sw_lng DECIMAL,
  ne_lat DECIMAL,
  ne_lng DECIMAL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  crypto_accepted JSONB,
  website TEXT,
  phone TEXT,
  hours JSONB,
  approved BOOLEAN,
  submitted_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.description,
    s.address,
    s.latitude,
    s.longitude,
    s.crypto_accepted,
    s.website,
    s.phone,
    s.hours,
    s.approved,
    s.submitted_by,
    s.approved_by,
    s.created_at,
    s.updated_at
  FROM public.shops s
  WHERE s.approved = TRUE
    AND s.latitude BETWEEN sw_lat AND ne_lat
    AND s.longitude BETWEEN sw_lng AND ne_lng
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_shops_in_bounds(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shops_in_bounds(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO anon;