ALTER TABLE cycle_member_snapshots
  ADD COLUMN IF NOT EXISTS savings_ratio NUMERIC(12,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distribution_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL;

ALTER TABLE cycle_member_snapshots DROP CONSTRAINT IF EXISTS cycle_member_snapshots_distribution_status_check;
ALTER TABLE cycle_member_snapshots ADD CONSTRAINT cycle_member_snapshots_distribution_status_check
  CHECK (distribution_status IN ('unpaid','paid'));

UPDATE cycle_member_snapshots snapshot
SET savings_ratio = CASE WHEN totals.total_savings > 0
  THEN snapshot.savings_amount / totals.total_savings ELSE 0 END
FROM (
  SELECT cycle_id, SUM(savings_amount) AS total_savings
  FROM cycle_member_snapshots GROUP BY cycle_id
) totals
WHERE totals.cycle_id = snapshot.cycle_id;

ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_action_type_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_action_type_check
  CHECK (action_type IN (
    'loan_disbursement','withdrawal','expense','penalty_waiver',
    'social_fund_disbursement','social_fund_contribution','shareout_payment'
  ));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'saving','loan_disbursement','repayment','withdrawal','fine',
    'social_fund','expense','shareout'
  ));
