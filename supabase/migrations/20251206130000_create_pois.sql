-- Create points_of_interest table
create table if not exists points_of_interest (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'school_primary', 'school_secondary', 'transport_metro', 'transport_train'
  lat double precision not null,
  lon double precision not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS: Enable read access for public
alter table points_of_interest enable row level security;

create policy "Public can view points_of_interest"
  on points_of_interest for select
  to public
  using (true);

-- Create index for geospatial queries (optional but good practice)
create index if not exists idx_pois_lat_lon on points_of_interest (lat, lon);
