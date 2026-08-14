ALTER TABLE financial_cycles DROP CONSTRAINT IF EXISTS financial_cycles_status_check;
ALTER TABLE financial_cycles ADD CONSTRAINT financial_cycles_status_check
  CHECK (status IN ('draft','active','closing','closed'));

ALTER TABLE savings ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE savings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE loans ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE penalties ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE social_fund_entries ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS cycle_id BIGINT REFERENCES financial_cycles(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION assign_active_financial_cycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cycle_id IS NULL THEN
    SELECT id INTO NEW.cycle_id FROM financial_cycles
    WHERE status='active' ORDER BY start_date DESC LIMIT 1;
    IF NEW.cycle_id IS NULL THEN
      RAISE EXCEPTION 'No active financial cycle. Activate a cycle before recording financial activity.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['savings','loans','transactions','penalties',
    'loan_repayments','group_expenses','social_fund_entries','meetings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS assign_cycle_before_insert ON %I',table_name);
    EXECUTE format('CREATE TRIGGER assign_cycle_before_insert BEFORE INSERT ON %I
      FOR EACH ROW EXECUTE FUNCTION assign_active_financial_cycle()',table_name);
  END LOOP;
END $$;

-- Legacy savings tables may not have created_at. Savings represent the current
-- member balance, so attach unmatched rows to the current working cycle.
UPDATE savings s SET cycle_id=c.id FROM financial_cycles c
WHERE s.cycle_id IS NULL AND c.status IN ('active','closing');
UPDATE loans l SET cycle_id=c.id FROM financial_cycles c
WHERE l.cycle_id IS NULL AND l.created_at::date BETWEEN c.start_date AND c.end_date;
UPDATE transactions t SET cycle_id=c.id FROM financial_cycles c
WHERE t.cycle_id IS NULL AND t.created_at::date BETWEEN c.start_date AND c.end_date;
UPDATE penalties p SET cycle_id=c.id FROM financial_cycles c
WHERE p.cycle_id IS NULL AND p.created_at::date BETWEEN c.start_date AND c.end_date;
UPDATE loan_repayments r SET cycle_id=c.id FROM financial_cycles c
WHERE r.cycle_id IS NULL AND r.paid_at::date BETWEEN c.start_date AND c.end_date;
UPDATE group_expenses e SET cycle_id=c.id FROM financial_cycles c
WHERE e.cycle_id IS NULL AND e.expense_date BETWEEN c.start_date AND c.end_date;
UPDATE social_fund_entries s SET cycle_id=c.id FROM financial_cycles c
WHERE s.cycle_id IS NULL AND s.created_at::date BETWEEN c.start_date AND c.end_date;
UPDATE meetings m SET cycle_id=c.id FROM financial_cycles c
WHERE m.cycle_id IS NULL AND m.meeting_date::date BETWEEN c.start_date AND c.end_date;

CREATE INDEX IF NOT EXISTS idx_savings_cycle ON savings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_loans_cycle ON loans(cycle_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cycle ON transactions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_penalties_cycle ON penalties(cycle_id);
CREATE INDEX IF NOT EXISTS idx_repayments_cycle ON loan_repayments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cycle ON group_expenses(cycle_id);
