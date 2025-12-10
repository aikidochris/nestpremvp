DROP VIEW IF EXISTS public.property_public_view;
CREATE OR REPLACE VIEW public.property_public_view AS
SELECT 
    p.id, p.id as property_id,
    p.lat, p.lon, p.house_number, p.street, p.town, p.postcode,
    p.display_label, p.price_estimate, p.last_sale_price, p.last_sale_date,
    p.home_type, p.market_status, p.asking_price, p.bedroom_estimate, p.floor_area_band,
    p.market_image_url, p.market_link,
    p.energy_rating,
    p.epc_floor_area,
    p.epc_property_type,
    COALESCE(i.is_for_sale, false) as is_for_sale,
    COALESCE(i.is_for_rent, false) as is_for_rent,
    COALESCE(i.soft_listing, false) as is_open_to_talking,
    (i.owner_id IS NOT NULL) as is_claimed,
    i.owner_id as claimed_by_user_id
FROM properties p
LEFT JOIN intent_flags i ON p.id = i.property_id;
GRANT SELECT ON public.property_public_view TO anon, authenticated, service_role;

