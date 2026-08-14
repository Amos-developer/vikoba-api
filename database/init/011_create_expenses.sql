CREATE TABLE IF NOT EXISTS group_expenses (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(40) NOT NULL CHECK (category IN (
    'stationery', 'mobile_money_charge', 'meeting_cost',
    'registration_cost', 'bank_charge', 'transport', 'other'
  )),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payee VARCHAR(150),
  description TEXT NOT NULL,
  reference VARCHAR(80),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approval_request_id BIGINT REFERENCES approval_requests(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_expenses_reference
  ON group_expenses(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_expenses_status_date
  ON group_expenses(status, expense_date DESC);
