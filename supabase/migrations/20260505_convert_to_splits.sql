create or replace function convert_to_splits(
  original_id uuid,
  splits jsonb
) returns void
language plpgsql
security definer
as $$
declare
  split jsonb;
begin
  -- Insert all splits first. If this fails, original is untouched.
  for split in select * from jsonb_array_elements(splits)
  loop
    insert into transactions (
      household_id,
      envelope_id,
      created_by,
      type,
      amount,
      description,
      merchant,
      receipt_url,
      transaction_date
    ) values (
      (split->>'household_id')::uuid,
      (split->>'envelope_id')::uuid,
      (split->>'created_by')::uuid,
      (split->>'type')::text,
      (split->>'amount')::numeric,
      (split->>'description')::text,
      (split->>'merchant')::text,
      (split->>'receipt_url')::text,
      (split->>'transaction_date')::date
    );
  end loop;

  -- Only delete the original after all inserts succeed.
  delete from transactions where id = original_id;
end;
$$;
