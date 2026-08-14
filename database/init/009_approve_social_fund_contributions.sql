ALTER TABLE approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_action_type_check;

ALTER TABLE approval_requests
  ADD CONSTRAINT approval_requests_action_type_check
  CHECK (action_type IN (
    'loan_disbursement', 'withdrawal', 'expense', 'penalty_waiver',
    'social_fund_disbursement', 'social_fund_contribution'
  ));
