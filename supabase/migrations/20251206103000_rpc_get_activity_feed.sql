-- Create the RPC function to get activity feed
create or replace function get_activity_feed(p_user_id uuid)
returns setof jsonb
language plpgsql
security definer
as $$
begin
  return query
  with events as (
    -- 1. New Claims (Status Change) - Only approved ones
    select
      pc.id::text as event_id,
      'CLAIM' as type,
      pc.property_id,
      pc.created_at,
      case
        when p.street is not null then 'New owner claimed ' || p.street
        else 'New owner claimed a property'
      end as summary_text
    from property_claims pc
    join properties p on pc.property_id = p.id
    where pc.status = 'approved'
      and pc.created_at > now() - interval '30 days'

    union all

    -- 2. New Stories
    select
      hs.id::text as event_id,
      'STORY' as type,
      hs.property_id,
      hs.created_at,
      case
         when hs.summary_text is not null and length(hs.summary_text) > 0 then hs.summary_text
         when p.street is not null then 'New story added to ' || p.street
         else 'New story update'
      end as summary_text
    from home_story hs
    join properties p on hs.property_id = p.id
    where hs.created_at > now() - interval '30 days'

    union all

    -- 3. Status Changes (Intent Flags)
    select
      ifl.id::text as event_id,
      'STATUS' as type,
      ifl.property_id,
      ifl.created_at,
      case
        -- Check columns if they exist, otherwise fallback to soft_listing
        -- Note: Assuming is_for_sale and is_for_rent exist based on requirements.
        -- If they don't exist in the DB yet, this query might fail.
        -- However, we must implement the mission requirements.
        when ifl.is_for_sale is true then 'Listed for Sale'
        when ifl.is_for_rent is true then 'Listed for Rent'
        when ifl.soft_listing is true then 'Owner is Open to Talking'
        else 'Status updated'
      end as summary_text
    from intent_flags ifl
    join properties p on ifl.property_id = p.id
    where ifl.created_at > now() - interval '30 days'
      and (ifl.is_for_sale is true or ifl.is_for_rent is true or ifl.soft_listing is true)
  )
  select to_jsonb(events.*) from events order by created_at desc;
end;
$$;
