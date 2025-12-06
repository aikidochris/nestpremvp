create or replace function get_heatmap_points(
  min_lat double precision,
  min_lon double precision,
  max_lat double precision,
  max_lon double precision,
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
    case
      when mode = 'market' then
        case 
          when coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false) then 0.8
          else 0.0
        end
      when mode = 'social' then
        least(1.0,
          (case when pc.user_id is not null then 0.3 else 0 end) +
          (case when coalesce(i.soft_listing, false) then 0.5 else 0 end) +
          (coalesce(fc.f_count, 0) * 0.2)
        )
      else -- 'all'
        least(1.0,
          0.1 + -- Base
          (case when pc.user_id is not null then 0.4 else 0 end) +
          (case when coalesce(i.soft_listing, false) then 0.4 else 0 end) +
          (case when coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false) then 0.6 else 0 end) +
          (coalesce(fc.f_count, 0) * 0.1)
        )
    end::double precision as intensity
  from properties p
  left join property_claims pc on p.id = pc.property_id
  left join intent_flags i on p.id = i.property_id
  left join follow_counts fc on p.id = fc.property_id
  where p.lat >= min_lat and p.lat <= max_lat
    and p.lon >= min_lon and p.lon <= max_lon
    -- Optimization: Filter out 0 intensity points to reduce payload
    and (
      (mode = 'market' and (coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false)))
      or
      (mode = 'social' and (pc.user_id is not null or coalesce(i.soft_listing, false) or fc.f_count > 0))
      or
      (mode = 'all') -- Return everything for 'all' to show base density
    );
end;
$$;
