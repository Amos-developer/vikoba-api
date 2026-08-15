BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  billing_email VARCHAR(255) NOT NULL,
  billing_phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_users (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL CHECK (role IN ('owner','admin','chairperson','treasurer','secretary','member')),
  is_billing_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id,user_id)
);

CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price_tzs NUMERIC(15,2) NOT NULL CHECK (price_tzs >= 0),
  billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('month','year')),
  member_limit INTEGER CHECK (member_limit IS NULL OR member_limit > 0),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans(code,name,description,price_tzs,billing_interval,member_limit,features,sort_order)
VALUES
 ('starter_monthly','Starter','Core VICOBA operations for small groups',15000,'month',30,'{"core":true,"reports":true,"approvals":true,"audit_logs":true,"exports":true}',10),
 ('growth_monthly','Growth','Complete operations for growing groups',35000,'month',100,'{"core":true,"reports":true,"approvals":true,"audit_logs":true,"exports":true,"priority_support":false}',20),
 ('professional_monthly','Professional','Advanced controls and support for large groups',75000,'month',NULL,'{"core":true,"reports":true,"approvals":true,"audit_logs":true,"exports":true,"priority_support":true,"api_access":true}',30),
 ('starter_yearly','Starter Annual','Starter with two months free',150000,'year',30,'{"core":true,"reports":true,"approvals":true,"audit_logs":true,"exports":true}',40),
 ('growth_yearly','Growth Annual','Growth with two months free',350000,'year',100,'{"core":true,"reports":true,"approvals":true,"audit_logs":true,"exports":true,"priority_support":false}',50),
 ('professional_yearly','Professional Annual','Professional with two months free',750000,'year',NULL,'{"core":true,"reports":true,"approvals":true,"audit_logs":true,"exports":true,"priority_support":true,"api_access":true}',60)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,price_tzs=EXCLUDED.price_tzs,member_limit=EXCLUDED.member_limit,features=EXCLUDED.features,is_active=TRUE;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id BIGINT REFERENCES plans(id) ON DELETE RESTRICT,
  status VARCHAR(25) NOT NULL CHECK (status IN ('trialing','active','past_due','grace_period','expired','cancelled','suspended')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_started_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  provider VARCHAR(40),
  provider_customer_id VARCHAR(160),
  provider_subscription_id VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(60) NOT NULL UNIQUE,
  amount_tzs NUMERIC(15,2) NOT NULL CHECK (amount_tzs > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','void','refunded')),
  due_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  provider VARCHAR(40) NOT NULL,
  provider_payment_id VARCHAR(180),
  reference VARCHAR(100) NOT NULL UNIQUE,
  amount_tzs NUMERIC(15,2) NOT NULL CHECK (amount_tzs > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','refunded')),
  payment_method VARCHAR(40),
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  provider_event_id VARCHAR(180) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,provider_event_id)
);

CREATE TABLE IF NOT EXISTS trial_claims (
  id BIGSERIAL PRIMARY KEY,
  normalized_email VARCHAR(255) NOT NULL UNIQUE,
  normalized_phone VARCHAR(30),
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS trial_claims_phone_unique ON trial_claims(normalized_phone) WHERE normalized_phone IS NOT NULL;

INSERT INTO organizations(name,slug,billing_email)
SELECT 'Legacy Vikoba Group','legacy-vikoba',COALESCE((SELECT email FROM users ORDER BY id LIMIT 1),'admin@localhost.invalid')
WHERE NOT EXISTS (SELECT 1 FROM organizations);

INSERT INTO organization_users(organization_id,user_id,role,is_billing_admin)
SELECT o.id,u.id,CASE WHEN u.role='admin' THEN 'owner' ELSE u.role END,u.role='admin'
FROM organizations o CROSS JOIN users u WHERE o.slug='legacy-vikoba'
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions(organization_id,plan_id,status,current_period_started_at,current_period_ends_at)
SELECT o.id,p.id,'active',NOW(),NOW()+INTERVAL '100 years'
FROM organizations o JOIN plans p ON p.code='professional_monthly' WHERE o.slug='legacy-vikoba'
ON CONFLICT (organization_id) DO NOTHING;

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE user_sessions s SET organization_id=(SELECT ou.organization_id FROM organization_users ou WHERE ou.user_id=s.user_id ORDER BY ou.created_at LIMIT 1) WHERE organization_id IS NULL;
ALTER TABLE user_sessions ALTER COLUMN organization_id SET NOT NULL;

CREATE OR REPLACE FUNCTION app_current_organization_id() RETURNS BIGINT AS $$
  SELECT NULLIF(current_setting('app.organization_id',true),'')::BIGINT
$$ LANGUAGE SQL STABLE;

DO $$
DECLARE table_name TEXT; legacy_id BIGINT;
BEGIN
  SELECT id INTO legacy_id FROM organizations WHERE slug='legacy-vikoba';
  FOREACH table_name IN ARRAY ARRAY[
    'members','savings','loans','transactions','penalties','loan_repayments',
    'approval_requests','meetings','meeting_attendance','social_fund_entries',
    'financial_cycles','cycle_member_snapshots','group_expenses','group_income',
    'audit_logs','cycle_share_settings','share_purchases'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE RESTRICT',table_name);
    EXECUTE format('UPDATE %I SET organization_id=$1 WHERE organization_id IS NULL',table_name) USING legacy_id;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET DEFAULT app_current_organization_id()',table_name);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL',table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(organization_id)', 'idx_'||table_name||'_organization',table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (organization_id=app_current_organization_id()) WITH CHECK (organization_id=app_current_organization_id())',table_name);
  END LOOP;
END $$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['subscriptions','invoices','subscription_payments'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (organization_id=app_current_organization_id()) WITH CHECK (organization_id=app_current_organization_id())',table_name);
  END LOOP;
END $$;

ALTER TABLE members ADD CONSTRAINT members_id_org_unique UNIQUE(id,organization_id);
ALTER TABLE loans ADD CONSTRAINT loans_id_org_unique UNIQUE(id,organization_id);
ALTER TABLE meetings ADD CONSTRAINT meetings_id_org_unique UNIQUE(id,organization_id);
ALTER TABLE financial_cycles ADD CONSTRAINT cycles_id_org_unique UNIQUE(id,organization_id);

ALTER TABLE savings ADD CONSTRAINT savings_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE loans ADD CONSTRAINT loans_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE transactions ADD CONSTRAINT transactions_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE penalties ADD CONSTRAINT penalties_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE loan_repayments ADD CONSTRAINT repayments_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE loan_repayments ADD CONSTRAINT repayments_loan_org_fk FOREIGN KEY(loan_id,organization_id) REFERENCES loans(id,organization_id);
ALTER TABLE meeting_attendance ADD CONSTRAINT attendance_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE meeting_attendance ADD CONSTRAINT attendance_meeting_org_fk FOREIGN KEY(meeting_id,organization_id) REFERENCES meetings(id,organization_id);
ALTER TABLE social_fund_entries ADD CONSTRAINT social_fund_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE share_purchases ADD CONSTRAINT share_purchase_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE share_purchases ADD CONSTRAINT share_purchase_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE cycle_share_settings ADD CONSTRAINT share_settings_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE cycle_member_snapshots ADD CONSTRAINT snapshot_member_org_fk FOREIGN KEY(member_id,organization_id) REFERENCES members(id,organization_id);
ALTER TABLE cycle_member_snapshots ADD CONSTRAINT snapshot_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);

ALTER TABLE savings ADD CONSTRAINT savings_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE loans ADD CONSTRAINT loans_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE transactions ADD CONSTRAINT transactions_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE penalties ADD CONSTRAINT penalties_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE loan_repayments ADD CONSTRAINT repayments_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE group_expenses ADD CONSTRAINT expenses_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE social_fund_entries ADD CONSTRAINT social_fund_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE meetings ADD CONSTRAINT meetings_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);
ALTER TABLE group_income ADD CONSTRAINT income_cycle_org_fk FOREIGN KEY(cycle_id,organization_id) REFERENCES financial_cycles(id,organization_id);

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_phone_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;
ALTER TABLE financial_cycles DROP CONSTRAINT IF EXISTS financial_cycles_name_key;
ALTER TABLE meeting_attendance DROP CONSTRAINT IF EXISTS meeting_attendance_meeting_id_member_id_key;
ALTER TABLE cycle_member_snapshots DROP CONSTRAINT IF EXISTS cycle_member_snapshots_cycle_id_member_id_key;
ALTER TABLE cycle_share_settings DROP CONSTRAINT IF EXISTS cycle_share_settings_cycle_id_key;
DROP INDEX IF EXISTS idx_one_active_financial_cycle;
DROP INDEX IF EXISTS idx_group_expenses_reference;
DROP INDEX IF EXISTS idx_loan_repayments_reference;
DROP INDEX IF EXISTS idx_group_income_reference;
DROP INDEX IF EXISTS idx_share_purchase_reference;
DROP INDEX IF EXISTS idx_transactions_reference;
DROP INDEX IF EXISTS idx_penalties_meeting_member;
DROP INDEX IF EXISTS idx_social_fund_reference;
CREATE UNIQUE INDEX members_phone_org_unique ON members(organization_id,phone);
CREATE UNIQUE INDEX members_email_org_unique ON members(organization_id,email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX cycles_name_org_unique ON financial_cycles(organization_id,name);
CREATE UNIQUE INDEX one_active_cycle_org_unique ON financial_cycles(organization_id) WHERE status='active';
CREATE UNIQUE INDEX attendance_meeting_member_org_unique ON meeting_attendance(organization_id,meeting_id,member_id);
CREATE UNIQUE INDEX snapshots_cycle_member_org_unique ON cycle_member_snapshots(organization_id,cycle_id,member_id);
CREATE UNIQUE INDEX share_settings_cycle_org_unique ON cycle_share_settings(organization_id,cycle_id);
CREATE UNIQUE INDEX expenses_reference_org_unique ON group_expenses(organization_id,reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX repayments_reference_org_unique ON loan_repayments(organization_id,reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX income_reference_org_unique ON group_income(organization_id,reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX share_purchase_reference_org_unique ON share_purchases(organization_id,reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX transaction_reference_org_unique ON transactions(organization_id,reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX penalty_meeting_member_org_unique ON penalties(organization_id,meeting_id,member_id) WHERE meeting_id IS NOT NULL;
CREATE UNIQUE INDEX social_fund_reference_org_unique ON social_fund_entries(organization_id,reference) WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organization_users_user ON organization_users(user_id,organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status,trial_ends_at,current_period_ends_at);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org ON subscription_payments(organization_id,created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='vikoba_user') THEN
    GRANT USAGE ON SCHEMA public TO vikoba_user;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vikoba_user;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vikoba_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO vikoba_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO vikoba_user;
  END IF;
END $$;

COMMIT;
