CREATE TABLE IF NOT EXISTS cycle_share_settings (
  id BIGSERIAL PRIMARY KEY,
  cycle_id BIGINT NOT NULL UNIQUE REFERENCES financial_cycles(id) ON DELETE RESTRICT,
  share_price NUMERIC(15,2) NOT NULL CHECK (share_price > 0),
  minimum_shares INTEGER NOT NULL DEFAULT 0 CHECK (minimum_shares >= 0),
  maximum_shares INTEGER CHECK (maximum_shares IS NULL OR maximum_shares > 0),
  configured_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (maximum_shares IS NULL OR maximum_shares >= minimum_shares)
);

CREATE TABLE IF NOT EXISTS share_purchases (
  id BIGSERIAL PRIMARY KEY,
  cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  number_of_shares INTEGER NOT NULL CHECK (number_of_shares > 0),
  share_price NUMERIC(15,2) NOT NULL CHECK (share_price > 0),
  total_value NUMERIC(15,2) GENERATED ALWAYS AS (number_of_shares * share_price) STORED,
  reference VARCHAR(80),
  notes VARCHAR(255),
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_purchase_reference ON share_purchases(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_share_purchase_cycle_member ON share_purchases(cycle_id,member_id,purchased_at DESC);
DROP TRIGGER IF EXISTS assign_cycle_before_insert ON share_purchases;
CREATE TRIGGER assign_cycle_before_insert BEFORE INSERT ON share_purchases
  FOR EACH ROW EXECUTE FUNCTION assign_active_financial_cycle();

ALTER TABLE cycle_member_snapshots
  ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_value NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'saving','share_purchase','loan_disbursement','repayment','withdrawal','fine',
    'social_fund','expense','shareout','other_income'
  ));
