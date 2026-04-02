-- Function to automatically allocate monthly budgets to all envelopes
-- This should be called at the start of each month (can be triggered by a cron job or manually)

CREATE OR REPLACE FUNCTION auto_allocate_monthly_budgets(
  p_household_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert allocation transactions for all active envelopes in the household
  INSERT INTO transactions (
    household_id,
    envelope_id,
    created_by,
    type,
    amount,
    description,
    transaction_date
  )
  SELECT
    e.household_id,
    e.id,
    p_user_id,
    'allocate',
    e.budget_amount,
    'Monthly budget allocation',
    CURRENT_DATE
  FROM envelopes e
  WHERE e.household_id = p_household_id
    AND e.archived = false
    AND e.budget_amount > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_allocate_monthly_budgets(uuid, uuid) TO authenticated;
