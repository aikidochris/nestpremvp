-- RPC for exporting admin data
create or replace function get_admin_export_data(export_type text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  if export_type = 'users' then
    select json_agg(u) into result
    from (
      select 
        email, 
        raw_user_meta_data->>'full_name' as name, 
        role, 
        created_at 
      from auth.users
      order by created_at desc
    ) u;
    
  elsif export_type = 'claims' then
    select json_agg(c) into result
    from (
      select 
        pc.property_id, 
        pc.status, 
        au.email as owner_email, 
        pc.created_at 
      from property_claims pc
      left join auth.users au on pc.user_id = au.id
      order by pc.created_at desc
    ) c;

  elsif export_type = 'missed_searches' then
    select json_agg(s) into result
    from (
      select 
        query, 
        found_count, 
        created_at 
      from search_logs 
      where found_count = 0 
      order by created_at desc
    ) s;
    
  else
    result := '[]'::json;
  end if;

  return coalesce(result, '[]'::json);
end;
$$;
