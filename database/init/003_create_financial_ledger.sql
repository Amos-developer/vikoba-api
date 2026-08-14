ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_direction_check;
DROP TRIGGER IF EXISTS transactions_are_immutable ON transactions;
ALTER TABLE transactions ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS direction VARCHAR(10),
  ADD COLUMN IF NOT EXISTS reference VARCHAR(80),
  ADD COLUMN IF NOT EXISTS recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

UPDATE transactions SET type = 'loan_disbursement' WHERE type = 'loan';

UPDATE transactions
SET direction = CASE
  WHEN type IN ('saving', 'repayment') THEN 'inflow'
  ELSE 'outflow'
END
WHERE direction IS NULL;

ALTER TABLE transactions ALTER COLUMN direction SET NOT NULL;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_direction_check
    CHECK (direction IN ('inflow', 'outflow')),
  ADD CONSTRAINT transactions_type_check
    CHECK (type IN (
      'saving', 'loan_disbursement', 'repayment', 'withdrawal',
      'fine', 'social_fund', 'expense'
    ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reference
  ON transactions(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financial ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_are_immutable ON transactions;
CREATE TRIGGER transactions_are_immutable
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();


