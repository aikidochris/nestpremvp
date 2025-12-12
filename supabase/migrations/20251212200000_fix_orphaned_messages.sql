-- Fix Orphaned Messages: Delete invalid messages before enforcing Foreign Key
-- Created: 2025-12-12

-- 1. DELETE ORPHANED MESSAGES
-- These are messages pointing to a thread_id that doesn't exist in message_threads.
-- This is necessary because we cannot add a Foreign Key constraint if invalid data exists.

DELETE FROM messages 
WHERE thread_id NOT IN (SELECT id FROM message_threads);

-- 2. ADD FOREIGN KEY CONSTRAINT
-- Now that data is clean, we can enforce the relationship.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_thread_id_fkey'
    ) THEN
        ALTER TABLE messages
        ADD CONSTRAINT messages_thread_id_fkey
        FOREIGN KEY (thread_id)
        REFERENCES message_threads(id)
        ON DELETE CASCADE;
    END IF;
END $$;
