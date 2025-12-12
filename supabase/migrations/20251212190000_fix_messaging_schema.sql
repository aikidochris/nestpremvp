-- Fix Messaging Schema: Ensure message_threads & unclaimed_notes exist with proper RLS
-- Created: 2025-12-12

-- ==============================================================================
-- 1. ENSURE MESSAGE_THREADS TABLE EXISTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    state TEXT NOT NULL DEFAULT 'talking',
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add last_message_at column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_threads' AND column_name = 'last_message_at'
    ) THEN
        ALTER TABLE message_threads ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- ==============================================================================
-- 2. ENSURE UNCLAIMED_NOTES TABLE EXISTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS unclaimed_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    sender_user_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_revealed BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE unclaimed_notes ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. MESSAGE_THREADS POLICIES (Drop and recreate for idempotency)
-- ==============================================================================

-- SELECT: Both owner and buyer can view their threads
DROP POLICY IF EXISTS "thread_select_participants" ON message_threads;
CREATE POLICY "thread_select_participants" ON message_threads
FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = owner_id);

-- INSERT: Buyer creates threads (when messaging owner)
DROP POLICY IF EXISTS "thread_insert_buyer" ON message_threads;
CREATE POLICY "thread_insert_buyer" ON message_threads
FOR INSERT WITH CHECK (auth.uid() = buyer_id OR auth.uid() = owner_id);

-- UPDATE: Participants can update (for state changes)
DROP POLICY IF EXISTS "thread_update_participants" ON message_threads;
CREATE POLICY "thread_update_participants" ON message_threads
FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = owner_id);

-- ==============================================================================
-- 5. MESSAGES POLICIES (Fix nested query issue)
-- ==============================================================================

-- SELECT: Thread participants can view messages via thread membership
DROP POLICY IF EXISTS "messages_select_thread_participants" ON messages;
CREATE POLICY "messages_select_thread_participants" ON messages
FOR SELECT USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR EXISTS (
        SELECT 1 FROM message_threads 
        WHERE message_threads.id = messages.thread_id
        AND (message_threads.owner_id = auth.uid() OR message_threads.buyer_id = auth.uid())
    )
);

-- ==============================================================================
-- 6. UNCLAIMED_NOTES POLICIES
-- ==============================================================================

-- INSERT: Anyone can leave a note (as sender)
DROP POLICY IF EXISTS "notes_insert_sender" ON unclaimed_notes;
CREATE POLICY "notes_insert_sender" ON unclaimed_notes
FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

-- SELECT: Property claimants can view notes for their property
DROP POLICY IF EXISTS "notes_select_claimant" ON unclaimed_notes;
CREATE POLICY "notes_select_claimant" ON unclaimed_notes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM property_claims
        WHERE property_claims.property_id = unclaimed_notes.property_id
        AND property_claims.user_id = auth.uid()
    )
);

-- UPDATE: Claimants can mark notes as revealed
DROP POLICY IF EXISTS "notes_update_claimant" ON unclaimed_notes;
CREATE POLICY "notes_update_claimant" ON unclaimed_notes
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM property_claims
        WHERE property_claims.property_id = unclaimed_notes.property_id
        AND property_claims.user_id = auth.uid()
    )
);

-- ==============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_message_threads_property ON message_threads(property_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_owner ON message_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_buyer ON message_threads(buyer_id);
CREATE INDEX IF NOT EXISTS idx_unclaimed_notes_property ON unclaimed_notes(property_id);
CREATE INDEX IF NOT EXISTS idx_unclaimed_notes_sender ON unclaimed_notes(sender_user_id);
