-- Property Flags table for reporting homes
CREATE TABLE IF NOT EXISTS property_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  user_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_flag_per_user_prop UNIQUE (user_id, property_id, status)
);

-- Enable RLS
ALTER TABLE property_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a flag
CREATE POLICY "Anyone can flag" ON property_flags 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only Admins can view flags
CREATE POLICY "Admins can view flags" ON property_flags 
  FOR SELECT TO authenticated 
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin'));

-- Only Admins can update flags
CREATE POLICY "Admins can update flags" ON property_flags 
  FOR UPDATE TO authenticated 
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin'));
