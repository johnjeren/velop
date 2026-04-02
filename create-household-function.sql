-- Create a function to handle household creation with proper permissions
-- This function runs with elevated privileges (security definer)

create or replace function create_household_and_profile(
  p_household_name text,
  p_display_name text,
  p_avatar_color text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_user_id uuid;
  v_avatar_color text;
begin
  -- Get the current user ID
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Generate random avatar color if not provided
  v_avatar_color := coalesce(
    p_avatar_color, 
    'hsl(' || floor(random() * 360)::text || ', 70%, 50%)'
  );

  -- Create the household
  insert into households (name)
  values (p_household_name)
  returning id into v_household_id;

  -- Update the user's profile
  insert into profiles (id, display_name, household_id, avatar_color)
  values (v_user_id, p_display_name, v_household_id, v_avatar_color)
  on conflict (id) 
  do update set 
    display_name = excluded.display_name,
    household_id = excluded.household_id,
    avatar_color = excluded.avatar_color;

  -- Return the household info
  return json_build_object(
    'household_id', v_household_id,
    'household_name', p_household_name
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function create_household_and_profile(text, text, text) to authenticated;
