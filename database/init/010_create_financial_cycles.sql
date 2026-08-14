CREATE TABLE IF NOT EXISTS financial_cycles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  closing_notes TEXT,
  closing_summary JSONB,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  closed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_financial_cycle
  ON financial_cycles(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS cycle_member_snapshots (
  id BIGSERIAL PRIMARY KEY,
  cycle_id BIGINT NOT NULL REFERENCES financial_cycles(id) ON DELETE RESTRICT,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  savings_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  earnings_share NUMERIC(15,2) NOT NULL DEFAULT 0,
  projected_shareout NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, member_id)
);
