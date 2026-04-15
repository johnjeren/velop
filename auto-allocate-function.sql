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
  -- Insert records into budget_periods for the current month
  INSERT INTO budget_periods (
    household_id,
    envelope_id,
    period_month,
    allocated
  )
  SELECT
    e.household_id,
    e.id,
    date_trunc('month', CURRENT_DATE)::date,
    e.budget_amount
  FROM envelopes e
  WHERE e.household_id = p_household_id
    AND e.archived = false
    AND e.budget_amount > 0
  ON CONFLICT (envelope_id, period_month) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_allocate_monthly_budgets(uuid, uuid) TO authenticated;
