-- Admin God Mode: Full CRUD for Properties

-- 1. Create Property
create or replace function admin_create_property(
  lat float,
  lon float,
  address_data json
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  -- Check if user is admin
  if not exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: Admin only';
  end if;

  insert into properties (lat, lon, house_number, street, postcode)
  values (
    lat,
    lon,
    address_data->>'house_number',
    address_data->>'street',
    address_data->>'postcode'
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- 2. Update Property
create or replace function admin_update_property(
  property_id uuid,
  update_data json
)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if user is admin
  if not exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: Admin only';
  end if;

  update properties
  set
    house_number = coalesce(update_data->>'house_number', house_number),
    street = coalesce(update_data->>'street', street),
    postcode = coalesce(update_data->>'postcode', postcode),
    price_estimate = coalesce(update_data->>'price_estimate', price_estimate)
  where id = property_id;
end;
$$;

-- 3. Delete Property
create or replace function admin_delete_property(
  target_property_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if user is admin
  if not exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: Admin only';
  end if;

  -- Manual Cascade Deletes (just in case FKs aren't set to cascade)
  delete from property_claims where property_id = target_property_id;
  delete from home_story where property_id = target_property_id;
  delete from intent_flags where property_id = target_property_id;
  delete from follows where property_id = target_property_id;
  -- Add other tables if necessary, e.g. saved_properties if it exists

  -- Finally delete the property
  delete from properties where id = target_property_id;
end;
$$;

-- 4. Move Pin
create or replace function admin_move_pin(
  target_property_id uuid,
  new_lat float,
  new_lon float
)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if user is admin
  if not exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Access denied: Admin only';
  end if;

  update properties
  set lat = new_lat, lon = new_lon
  where id = target_property_id;
end;
$$;
