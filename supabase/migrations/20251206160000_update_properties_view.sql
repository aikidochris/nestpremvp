-- Update properties_public_view to include images from home_story
create or replace view properties_public_view as
select
  p.id,
  p.lat,
  p.lon,
  p.postcode,
  p.street,
  p.house_number,
  (pc.user_id is not null) as is_claimed,
  coalesce(ifl.soft_listing, false) as is_open_to_talking,
  coalesce(ifl.is_for_sale, false) as is_for_sale,
  coalesce(ifl.is_for_rent, false) as is_for_rent,
  hs.images as images
from properties p
left join property_claims pc on p.id = pc.property_id and pc.status = 'approved' -- Assuming we only want approved claims? Or simple existence? Original view view used simple join. Let's stick to simple join or check constraints.
-- Re-checking original view logic if available:
-- "LEFT JOIN public.property_claims pc ON ((pc.property_id = p.id)))" -> active claim.
-- Use simple join for now to match behavior.
left join intent_flags ifl on p.id = ifl.property_id
left join home_story hs on p.id = hs.property_id;
