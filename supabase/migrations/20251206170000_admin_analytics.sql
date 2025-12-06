-- Create table for tracking search queries (especially "Ghost" searches with 0 results)
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id), -- Optional, if user is logged in
  query text not null,
  found_count int not null,
  created_at timestamptz default now()
);

-- Secure the logs (Admin read only usually, but public insert for the app?)
alter table search_logs enable row level security;

create policy "Enable insert for everyone"
on search_logs for insert
with check (true); 

create policy "Enable read for service role only"
on search_logs for select
using ( auth.role() = 'service_role' );


-- Admin Stats RPC
create or replace function get_admin_stats()
returns json
language plpgsql
security definer
as $$
declare
  total_users_count int;
  total_claims_count int;
  total_follows_count int;
  total_conversations_count int;
  for_sale_count int;
  for_rent_count int;
  soft_listing_count int;
  recent_activity json;
  ghost_searches json;
begin
  -- 1. Total Users
  select count(*) into total_users_count from auth.users;

  -- 2. Total Claims
  select count(*) into total_claims_count from property_claims where status = 'approved';

  -- 3. Total Follows
  select count(*) into total_follows_count from follows;

  -- 4. Total Conversations (distinct properties discussed)
  select count(distinct property_id) into total_conversations_count from messages;

  -- 5. Intent Breakdown
  select count(*) into for_sale_count from intent_flags where is_for_sale = true;
  select count(*) into for_rent_count from intent_flags where is_for_rent = true;
  select count(*) into soft_listing_count from intent_flags where soft_listing = true;

  -- 6. Recent Activity
  with latest_events as (
    select created_at, 'claim' as type, property_id::text as id from property_claims order by created_at desc limit 5
    union all
    select created_at, 'follow' as type, property_id::text as id from follows order by created_at desc limit 5
    union all
    select created_at, 'intent' as type, property_id::text as id from intent_flags order by created_at desc limit 5
  )
  select json_agg(t) into recent_activity from (
    select * from latest_events order by created_at desc limit 10
  ) t;

  -- 7. Ghost Searches (0 results)
  select json_agg(s) into ghost_searches from (
    select query, created_at, found_count 
    from search_logs 
    where found_count = 0 
    order by created_at desc 
    limit 10
  ) s;

  return json_build_object(
    'total_users', total_users_count,
    'total_claims', total_claims_count,
    'total_follows', total_follows_count,
    'total_conversations', total_conversations_count,
    'intent_breakdown', json_build_object(
      'for_sale', for_sale_count,
      'for_rent', for_rent_count,
      'soft_listing', soft_listing_count
    ),
    'recent_activity', coalesce(recent_activity, '[]'::json),
    'ghost_searches', coalesce(ghost_searches, '[]'::json)
  );
end;
$$;
