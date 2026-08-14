ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'chairperson', 'treasurer', 'secretary', 'member'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS approval_requests (
    id BIGSERIAL PRIMARY KEY,
    action_type VARCHAR(40) NOT NULL
      CHECK (action_type IN ('loan_disbursement', 'withdrawal', 'expense', 'penalty_waiver')),
    entity_id BIGINT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON approval_requests(requested_by);


