CREATE TABLE IF NOT EXISTS group_income (
  id BIGSERIAL PRIMARY KEY,
  cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT,
  category VARCHAR(30) NOT NULL CHECK (category IN ('service_charge','other')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payer VARCHAR(150),
  description TEXT NOT NULL,
  reference VARCHAR(80),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_income_reference
  ON group_income(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_income_cycle_status ON group_income(cycle_id,status,income_date DESC);

DROP TRIGGER IF EXISTS assign_cycle_before_insert ON group_income;
CREATE TRIGGER assign_cycle_before_insert BEFORE INSERT ON group_income
  FOR EACH ROW EXECUTE FUNCTION assign_active_financial_cycle();

ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_action_type_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_action_type_check
  CHECK (action_type IN (
    'loan_disbursement','withdrawal','expense','penalty_waiver',
    'social_fund_disbursement','social_fund_contribution','shareout_payment','other_income'
  ));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'saving','loan_disbursement','repayment','withdrawal','fine',
    'social_fund','expense','shareout','other_income'
  ));
