-- Fix RLS policy for households to allow authenticated users to create households
-- Drop ALL existing policies and recreate them with proper permissions

drop policy if exists "anyone can insert household" on households;
drop policy if exists "authenticated users can insert household" on households;
drop policy if exists "household members can read" on households;
drop policy if exists "household members can update" on households;

-- Allow authenticated users to insert households
create policy "authenticated users can insert household" 
  on households 
  for insert 
  to authenticated
  with check (true);

-- Allow household members to read their household
create policy "household members can read" on households 
  for select 
  to authenticated
  using (id = (select household_id from profiles where id = auth.uid()));

-- Allow household members to update their household
create policy "household members can update" on households 
  for update 
  to authenticated
  using (id = (select household_id from profiles where id = auth.uid()));
