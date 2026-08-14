CREATE TABLE IF NOT EXISTS loan_repayments (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    balance_before NUMERIC(15, 2) NOT NULL CHECK (balance_before >= 0),
    balance_after NUMERIC(15, 2) NOT NULL CHECK (balance_after >= 0),
    due_date DATE,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    reference VARCHAR(80),
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_repayments_reference
  ON loan_repayments(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id
  ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_member_id
  ON loan_repayments(member_id);


