-- RPC to update claim status
create or replace function admin_update_claim_status(claim_id uuid, new_status text)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from property_claims where id = claim_id) then
    raise exception 'Claim not found';
  end if;

  update property_claims
  set status = new_status
  where id = claim_id;
  
  -- If approved, we might want to ensure only one active claim per property? 
  -- For now, just simplistic update.
end;
$$;

-- RPC to list users for admin
create or replace function admin_list_users()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_agg(u) into result
  from (
    select 
      au.id,
      au.email,
      au.created_at,
      p.display_name,
      p.role,
      p.avatar_url
    from auth.users au
    left join profiles p on au.id = p.user_id
    order by au.created_at desc
  ) u;
  
  return coalesce(result, '[]'::json);
end;
$$;

-- RPC to list claims for admin
create or replace function admin_list_claims()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_agg(c) into result
  from (
    select 
      pc.id,
      pc.property_id,
      pc.created_at,
      pc.status,
      au.email as claimant_email,
      ppv.street,
      ppv.house_number,
      ppv.postcode
    from property_claims pc
    left join auth.users au on pc.user_id = au.id
    left join properties_public_view ppv on pc.property_id = ppv.id
    order by pc.created_at desc
  ) c;

  return coalesce(result, '[]'::json);
end;
$$;

-- RPC to delete a user (admin only)
-- Be careful with this, cascading deletes might be needed depending on FK constraints
create or replace function admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete profile first if cascade isn't set up (usually it is on user_id)
  delete from public.profiles where user_id = target_user_id;
  
  -- Delete from auth.users (this should waterfall if setup correctly, but let's be explicit if needed)
  delete from auth.users where id = target_user_id;
end;
$$;
