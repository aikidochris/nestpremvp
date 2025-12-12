-- Elastic Social Shopfront Migration
-- Creates property_endorsements table and adds highlights column to home_story

-- 1. Add highlights array to home_story table
ALTER TABLE home_story 
ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT '{}';

-- 2. Create property_endorsements table (Neighbor Vouching)
CREATE TABLE IF NOT EXISTS property_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_property_user_endorsement UNIQUE(property_id, user_id)
);

ALTER TABLE property_endorsements ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read endorsements
CREATE POLICY "Endorsements are public" ON property_endorsements
  FOR SELECT USING (true);

-- RLS: Authenticated users can insert (further validation in RPC)
CREATE POLICY "Authenticated can endorse" ON property_endorsements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: Users can delete their own endorsements
CREATE POLICY "Users can remove own endorsement" ON property_endorsements
  FOR DELETE USING (auth.uid() = user_id);

-- 3. RPC: Check if user can vouch (has claimed property within 1000m)
CREATE OR REPLACE FUNCTION can_vouch_for_property(target_property_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM property_claims pc
    JOIN properties claimed_p ON pc.property_id = claimed_p.id
    JOIN properties target_p ON target_p.id = target_property_id
    WHERE pc.user_id = auth.uid()
      AND pc.status = 'claimed'
      AND pc.property_id != target_property_id
      AND (
        -- Use lat/lon with haversine if geom is null
        CASE 
          WHEN claimed_p.geom IS NOT NULL AND target_p.geom IS NOT NULL THEN
            ST_DWithin(claimed_p.geom::geography, target_p.geom::geography, 1000)
          ELSE
            -- Haversine fallback (approx 1km = 0.009 degrees lat)
            sqrt(power(claimed_p.lat - target_p.lat, 2) + 
                 power((claimed_p.lon - target_p.lon) * cos(radians(target_p.lat)), 2)) < 0.009
        END
      )
  );
$$;

-- 4. RPC: Get endorsement count for a property
CREATE OR REPLACE FUNCTION get_endorsement_count(target_property_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM property_endorsements
  WHERE property_id = target_property_id;
$$;

-- 5. Grants
GRANT SELECT, INSERT, DELETE ON property_endorsements TO authenticated;
GRANT SELECT ON property_endorsements TO anon;
GRANT EXECUTE ON FUNCTION can_vouch_for_property TO authenticated;
GRANT EXECUTE ON FUNCTION get_endorsement_count TO anon, authenticated;
