-- Enable RLS on message_threads
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT (Creation)
-- A user can create a thread if they are the buyer or the owner (usually buyer initiates).
-- Specifically, we check if auth.uid() is the buyer_id.
CREATE POLICY "Users can create threads as buyer" 
ON message_threads 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

-- Policy: SELECT (Viewing)
-- A user can view a thread if they are the buyer OR the owner.
CREATE POLICY "Users can view their own threads" 
ON message_threads 
FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = owner_id);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT (Sending)
-- A user can send a message if they are a participant in the thread.
-- This requires a join or a subquery to check thread participation.
CREATE POLICY "Participants can send messages" 
ON messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM message_threads 
        WHERE id = messages.thread_id 
        AND (buyer_id = auth.uid() OR owner_id = auth.uid())
    )
);

-- Policy: SELECT (Reading)
-- A user can read messages if they are a participant in the thread.
CREATE POLICY "Participants can read messages" 
ON messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM message_threads 
        WHERE id = messages.thread_id 
        AND (buyer_id = auth.uid() OR owner_id = auth.uid())
    )
);

-- Enable RLS on home_story
ALTER TABLE home_story ENABLE ROW LEVEL SECURITY;

-- Allow public read access to stories
CREATE POLICY "Public profiles are viewable by everyone" 
ON home_story FOR SELECT 
USING ( true );

-- Allow users to insert their own story
CREATE POLICY "Users can insert their own story" 
ON home_story FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- Allow users to update their own story
CREATE POLICY "Users can update their own story" 
ON home_story FOR UPDATE 
USING ( auth.uid() = user_id );

-- Enable RLS on intent_flags
ALTER TABLE intent_flags ENABLE ROW LEVEL SECURITY;

-- Allow public read access to intent flags
CREATE POLICY "Intent flags are viewable by everyone" 
ON intent_flags FOR SELECT 
USING ( true );

-- Allow owners to insert/update their intent flags
CREATE POLICY "Owners can manage intent flags" 
ON intent_flags FOR ALL 
USING ( auth.uid() = owner_id );

-- STORAGE POLICIES
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'property-images' );

CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.role() = 'authenticated'
);


-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

