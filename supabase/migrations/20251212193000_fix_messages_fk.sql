-- Fix Missing Foreign Key: Link messages to message_threads
-- Created: 2025-12-12

-- This constraint enables PostgREST to perform the nested join:
-- message_threads -> messages

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
