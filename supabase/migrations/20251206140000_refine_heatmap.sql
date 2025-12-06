-- Drop the legacy version first to avoid return type conflict
drop function if exists get_heatmap_points(double precision, double precision, double precision, double precision, text);

create or replace function get_heatmap_points(
  north double precision,
  south double precision,
  east double precision,
  west double precision,
  mode text default 'all' -- Kept for signature compatibility, but ignored or treated as Buzz
)
returns table (
  lat double precision,
  lon double precision,
  intensity double precision
)
language plpgsql
security definer
as $$
begin
  return query
  with follow_counts as (
    select property_id, count(*)::int as f_count
    from follows
    where follow_type = 'property'
    group by property_id
  )
  select
    p.lat,
    p.lon,
    -- "The Demand Layer" Algorithm
    least(1.0,
      -- 1. Claimed Status (+0.3)
      (case when pc.user_id is not null then 0.3 else 0 end) +
      -- 2. Soft Listing / Open to Talking (+0.5)
      (case when coalesce(i.soft_listing, false) then 0.5 else 0 end) +
      -- 3. Follows (+0.2 per follow)
      (coalesce(fc.f_count, 0) * 0.2)
    )::double precision as intensity
  from properties p
  left join property_claims pc on p.id = pc.property_id
  left join intent_flags i on p.id = i.property_id
  left join follow_counts fc on p.id = fc.property_id
  where p.lat >= south and p.lat <= north
    and p.lon >= west and p.lon <= east
    -- Only show points with NON-ZERO demand (Buzz)
    -- This ensures we don't return a sea of 0.0 points
    and (
      (pc.user_id is not null) or
      coalesce(i.soft_listing, false) or
      coalesce(fc.f_count, 0) > 0
    );
end;
$$;
