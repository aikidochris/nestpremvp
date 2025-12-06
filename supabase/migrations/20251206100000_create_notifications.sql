
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('status_change', 'claim', 'story', 'system')),
  title text not null,
  message text not null,
  resource_id uuid references properties(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS
alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- System can insert notifications (usually via edge functions or triggers, but for now we might insert from client for testing or specific flows if needed, though strictly it should be server-side. For this task, we'll allow insert if user is involved, or rely on service_role for backend triggers. Assuming triggers/functions will handle creation in production, but purely for this task prompt "real-time... listen for INSERT", we assume something is inserting them. We won't add an INSERT policy for users unless they trigger it themselves, but usually notifications are system generated. Let's add a policy for authenticated users to insert just in case we need to seed/test from client, though in a real app this would be restricted.)
-- For safety, I'll restrict INSERT to service_role mostly, but if the "System" is the user performing an action that notifies THEMSELVES (unlikely) or others.
-- Actually, the requirement says "when properties they follow change status". This implies a trigger or backend process inserts.
-- I will NOT add an INSERT policy for public/authenticated users to prevent spam, assuming a backend process/trigger handles creation. 
-- However, since I am not implementing the *triggers* in this prompt (only the table), I assume the environment acts as the system.

-- If the user *needs* to simulate notifications, I might need to add an insert policy for testing purposes. 
-- Requirement "Users can only SELECT and UPDATE". So I will stick to that.
