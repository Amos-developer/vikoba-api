ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_action_type_check;
ALTER TABLE approval_requests
  ADD CONSTRAINT approval_requests_action_type_check
  CHECK (action_type IN (
    'loan_disbursement', 'withdrawal', 'expense',
    'penalty_waiver', 'social_fund_disbursement'
  ));

CREATE TABLE IF NOT EXISTS social_fund_entries (
    id BIGSERIAL PRIMARY KEY,
    entry_type VARCHAR(20) NOT NULL
      CHECK (entry_type IN ('contribution', 'disbursement')),
    category VARCHAR(30) NOT NULL
      CHECK (category IN ('contribution', 'sickness', 'funeral', 'emergency', 'other')),
    member_id BIGINT REFERENCES members(id) ON DELETE RESTRICT,
    beneficiary_name VARCHAR(150),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    reference VARCHAR(80),
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_fund_reference
  ON social_fund_entries(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_fund_type_date
  ON social_fund_entries(entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_fund_member
  ON social_fund_entries(member_id);
