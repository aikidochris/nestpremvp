-- Allow property owners to update display_label and market_image_url
-- First, check if RLS is enabled (it likely is, but we need a policy)

-- Create policy for owners to update their claimed property display info
CREATE POLICY "Owners can update display_label on claimed properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
    -- Check if this user has claimed this property via intent_flags
    EXISTS (
        SELECT 1 FROM public.intent_flags 
        WHERE intent_flags.property_id = properties.id 
        AND intent_flags.owner_id = auth.uid()
    )
    OR
    -- Fallback: check property_claims table
    EXISTS (
        SELECT 1 FROM public.property_claims
        WHERE property_claims.property_id = properties.id
        AND property_claims.user_id = auth.uid()
        AND property_claims.status = 'claimed'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.intent_flags 
        WHERE intent_flags.property_id = properties.id 
        AND intent_flags.owner_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.property_claims
        WHERE property_claims.property_id = properties.id
        AND property_claims.user_id = auth.uid()
        AND property_claims.status = 'claimed'
    )
);
