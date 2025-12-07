-- Update Admin Stats RPC to include Growth Charts and Hotspots
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
  daily_signups json;
  daily_claims json;
  hotspots json;
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

  -- 8. Daily Signups (Last 30 days)
  select json_agg(d) into daily_signups from (
    select date_trunc('day', created_at)::date as date, count(*) as count
    from auth.users
    where created_at > now() - interval '30 days'
    group by 1
    order by 1
  ) d;

  -- 9. Daily Claims (Last 30 days)
  select json_agg(d) into daily_claims from (
    select date_trunc('day', created_at)::date as date, count(*) as count
    from property_claims
    where created_at > now() - interval '30 days'
    group by 1
    order by 1
  ) d;

  -- 10. Hotspots (Grouping properties by postcode district)
  -- Aggregating properties and search_logs by regex extraction of postcode district
  with prop_counts as (
    select 
      substring(postcode from '^([A-Z]{1,2}[0-9][0-9A-Z]?)') as district,
      count(*) as active_homes
    from properties 
    where postcode is not null
    group by 1
  ),
  search_counts as (
    select 
      substring(upper(query) from '^([A-Z]{1,2}[0-9][0-9A-Z]?)') as district,
      count(*) as ghost_count
    from search_logs 
    where found_count = 0 
    and query ~* '^[A-Z]{1,2}[0-9][0-9A-Z]?'
    group by 1
  )
  select json_agg(h) into hotspots from (
    select 
      coalesce(p.district, s.district) as district,
      coalesce(p.active_homes, 0) as active_homes,
      coalesce(s.ghost_count, 0) as ghost_searches
    from prop_counts p
    full outer join search_counts s on p.district = s.district
    where coalesce(p.district, s.district) is not null
    order by active_homes desc, ghost_searches desc
    limit 10
  ) h;

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
    'ghost_searches', coalesce(ghost_searches, '[]'::json),
    'daily_signups', coalesce(daily_signups, '[]'::json),
    'daily_claims', coalesce(daily_claims, '[]'::json),
    'hotspots', coalesce(hotspots, '[]'::json)
  );
end;
$$;
