-- Update property_public_view to include columns required by frontend API
-- Fixes "cannot drop columns from view" by dropping and recreating
-- Adds: display_label, last_sale_price, last_sale_date, energy_rating, epc_floor_area, epc_property_type, price_estimate

DROP VIEW IF EXISTS "public"."property_public_view";

CREATE VIEW "public"."property_public_view" AS 
SELECT 
    p.id AS property_id,
    p.lat,
    p.lon,
    -- Add new columns
    p.postcode,
    p.street,
    p.house_number,
    p.display_label,
    p.last_sale_price,
    p.last_sale_date,
    p.energy_rating,
    p.epc_floor_area,
    p.epc_property_type,
    p.price_estimate,
    -- Claim Status
    pc.user_id AS claimed_by_user_id,
    (pc.user_id IS NOT NULL) AS is_claimed,
    -- Intent Flags
    COALESCE(ifl.soft_listing, false) AS is_open_to_talking,
    COALESCE(ifl.is_for_sale, false) AS is_for_sale,
    COALESCE(ifl.is_for_rent, false) AS is_for_rent,
    -- Derived
    COALESCE(p.created_at > (now() - interval '30 days'), false) AS has_recent_activity
FROM 
    public.properties p
    LEFT JOIN public.property_claims pc ON p.id = pc.property_id AND pc.status = 'claimed'
    LEFT JOIN public.intent_flags ifl ON p.id = ifl.property_id;

-- Restore permissions
GRANT SELECT ON "public"."property_public_view" TO "anon";
GRANT SELECT ON "public"."property_public_view" TO "authenticated";
GRANT SELECT ON "public"."property_public_view" TO "service_role";
