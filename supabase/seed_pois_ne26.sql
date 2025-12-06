-- Seed NE26 POIs (Schools & Transport)

insert into points_of_interest (name, type, lat, lon, metadata)
values 
  -- Transport
  ('Whitley Bay Metro', 'transport_metro', 55.0397, -1.4423, '{"line": "Yellow"}'::jsonb),
  ('Monkseaton Metro', 'transport_metro', 55.0423, -1.4580, '{"line": "Yellow"}'::jsonb),
  ('West Monkseaton Metro', 'transport_metro', 55.0408, -1.4725, '{"line": "Yellow"}'::jsonb),
  
  -- Schools
  ('Marine Park First School', 'school_primary', 55.0435, -1.4450, '{"rating": "Outstanding", "catchment_radius_meters": 600}'::jsonb),
  ('Whitley Bay High School', 'school_secondary', 55.0480, -1.4658, '{"rating": "Outstanding", "catchment_radius_meters": 1200}'::jsonb),
  ('Valley Gardens Middle School', 'school_secondary', 55.0450, -1.4750, '{"rating": "Good", "catchment_radius_meters": 1000}'::jsonb),
  ('Rockcliffe First School', 'school_primary', 55.0380, -1.4480, '{"rating": "Good", "catchment_radius_meters": 500}'::jsonb);
