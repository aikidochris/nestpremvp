create or replace function get_heatmap_points(
  min_lat double precision,
  min_lon double precision,
  max_lat double precision,
  max_lon double precision
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
  select
    p.lat,
    p.lon,
    least(1.0,
      0.1 + -- Base
      case when pc.user_id is not null then 0.3 else 0 end + -- Claimed
      case when coalesce(i.soft_listing, false) then 0.3 else 0 end + -- Open to talking / soft listing
      case when coalesce(i.is_for_sale, false) or coalesce(i.is_for_rent, false) then 0.5 else 0 end -- For sale/rent
    )::double precision as intensity
  from properties p
  left join property_claims pc on p.id = pc.property_id
  left join intent_flags i on p.id = i.property_id
  where p.lat >= min_lat and p.lat <= max_lat
    and p.lon >= min_lon and p.lon <= max_lon;
end;
$$;
