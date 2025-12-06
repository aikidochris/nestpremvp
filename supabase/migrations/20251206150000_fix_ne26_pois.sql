-- Fix NE26 POI Locations (Accurate Coordinates)
-- This ensures they are not in the sea!

-- Whitley Bay Metro
UPDATE points_of_interest SET lat = 55.040974, lon = -1.446860 WHERE name = 'Whitley Bay Metro';
-- Monkseaton Metro
UPDATE points_of_interest SET lat = 55.042784, lon = -1.458265 WHERE name = 'Monkseaton Metro';
-- West Monkseaton Metro
UPDATE points_of_interest SET lat = 55.045053, lon = -1.468087 WHERE name = 'West Monkseaton Metro';

-- Schools
-- Whitley Bay High School
UPDATE points_of_interest SET lat = 55.044546, lon = -1.451833 WHERE name = 'Whitley Bay High School';
-- Marine Park First School
UPDATE points_of_interest SET lat = 55.042258, lon = -1.444641 WHERE name = 'Marine Park First School';
-- Valley Gardens Middle School
UPDATE points_of_interest SET lat = 55.050186, lon = -1.465053 WHERE name = 'Valley Gardens Middle School';
-- Rockcliffe First School
UPDATE points_of_interest SET lat = 55.039891, lon = -1.442122 WHERE name = 'Rockcliffe First School';
