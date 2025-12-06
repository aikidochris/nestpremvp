-- Drop the legacy version first to avoid return type conflict
drop function if exists get_heatmap_points(double precision, double precision, double precision, double precision, text);

create or replace function get_heatmap_points(
  north double precision,
  south double precision,
  east double precision,
  west double precision,
  mode text default 'all'
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
    -- Calculation Logic
    least(1.0,
      greatest(
        -- Level 3: Action (0.8)
        case when coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false) then 0.8 else 0 end,
        -- Level 2: Interest (0.5)
        case when coalesce(i.soft_listing, false) then 0.5 else 0 end,
        -- Level 1: Buzz (0.2)
        case when pc.user_id is not null or coalesce(fc.f_count, 0) > 0 then 0.2 else 0 end
      ) +
      -- Booster: +0.1 for every 5 follows
      (floor(coalesce(fc.f_count, 0) / 5.0) * 0.1)
    )::double precision as intensity
  from properties p
  left join property_claims pc on p.id = pc.property_id
  left join intent_flags i on p.id = i.property_id
  left join follow_counts fc on p.id = fc.property_id
  where p.lat >= south and p.lat <= north
    and p.lon >= west and p.lon <= east
    -- Filter out zero intensity (The Demand Map concept: empty space is dark)
    and (
      greatest(
        case when coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false) then 0.8 else 0 end,
        case when coalesce(i.soft_listing, false) then 0.5 else 0 end,
        case when pc.user_id is not null or coalesce(fc.f_count, 0) > 0 then 0.2 else 0 end
      ) > 0
    )
    and (
      mode = 'all'
      or (mode = 'market' and (coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false)))
      or (mode = 'social' and (pc.user_id is not null or coalesce(i.soft_listing, false) or coalesce(fc.f_count, 0) > 0))
    );
end;
$$;
