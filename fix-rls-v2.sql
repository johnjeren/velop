-- Alternative approach: Use a permissive policy that checks auth.uid() exists
drop policy if exists "anyone can insert household" on households;
drop policy if exists "authenticated users can insert household" on households;

-- Allow any authenticated user to create a household
create policy "authenticated users can insert household" 
  on households 
  for insert 
  to authenticated
  with check (auth.uid() is not null);
