CREATE TABLE IF NOT EXISTS cooperatives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  regency TEXT NOT NULL,
  province TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_queue (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  source TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_queue_status_idx ON operator_queue(status);
CREATE INDEX IF NOT EXISTS operator_queue_module_idx ON operator_queue(module);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT REFERENCES cooperatives(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  title TEXT NOT NULL DEFAULT 'Operator koperasi',
  phone TEXT,
  avatar_initials TEXT NOT NULL DEFAULT 'AD',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS cooperative_id TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_cooperative_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_cooperative_id_fkey
      FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_cooperative_idx ON users(cooperative_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_token_idx ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  action_href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  state TEXT NOT NULL,
  location TEXT NOT NULL,
  restock_requested BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyer_matches (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  buyer TEXT NOT NULL,
  need TEXT NOT NULL,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anak_sarengklek_buyer_requirements (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  buyer_archetype TEXT NOT NULL,
  product_name TEXT NOT NULL,
  required_quantity NUMERIC(14, 2) NOT NULL,
  unit_label TEXT NOT NULL,
  quality_spec TEXT NOT NULL,
  packaging_spec TEXT NOT NULL,
  target_window TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  source_label TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anak_sarengklek_buyer_requirements_coop_idx
  ON anak_sarengklek_buyer_requirements(cooperative_id);
CREATE INDEX IF NOT EXISTS anak_sarengklek_buyer_requirements_product_idx
  ON anak_sarengklek_buyer_requirements(product_name);

CREATE TABLE IF NOT EXISTS anak_sarengklek_stock_ledger (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  stock_item_id TEXT NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL,
  unit_label TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  readiness_status TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anak_sarengklek_stock_ledger_stock_idx
  ON anak_sarengklek_stock_ledger(stock_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS anak_sarengklek_stock_ledger_coop_idx
  ON anak_sarengklek_stock_ledger(cooperative_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anak_sarengklek_media_evidence (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  related_record_type TEXT NOT NULL,
  related_record_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  storage_uri TEXT NOT NULL,
  redacted_label TEXT NOT NULL,
  caption TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  source_label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anak_sarengklek_media_evidence_related_idx
  ON anak_sarengklek_media_evidence(related_record_type, related_record_id);
CREATE INDEX IF NOT EXISTS anak_sarengklek_media_evidence_coop_idx
  ON anak_sarengklek_media_evidence(cooperative_id, created_at DESC);

CREATE TABLE IF NOT EXISTS finance_requests (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  member TEXT NOT NULL,
  purpose TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_sections (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  included BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_periods (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wa_messages (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  intent TEXT NOT NULL,
  module TEXT NOT NULL,
  bot_reply TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
CREATE INDEX IF NOT EXISTS wa_messages_created_at_idx ON wa_messages(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_provider_message_id_idx
  ON wa_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  cooperative_id TEXT NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  status TEXT NOT NULL,
  output TEXT NOT NULL,
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT NOT NULL,
  next_action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_runs_created_at_idx ON agent_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS map_regions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  color TEXT NOT NULL,
  village_code TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE IF NOT EXISTS villages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  regency TEXT NOT NULL,
  province TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  summary TEXT NOT NULL,
  source_note TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS villages_name_idx ON villages(name);
CREATE INDEX IF NOT EXISTS villages_province_idx ON villages(province);

CREATE TABLE IF NOT EXISTS village_commodities (
  id TEXT PRIMARY KEY,
  village_code TEXT NOT NULL REFERENCES villages(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supply TEXT NOT NULL,
  demand TEXT NOT NULL,
  quantity TEXT NOT NULL,
  price_signal TEXT NOT NULL,
  opportunity TEXT NOT NULL,
  risk TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS village_commodities_name_idx ON village_commodities(name);

CREATE TABLE IF NOT EXISTS village_assets (
  id TEXT PRIMARY KEY,
  village_code TEXT NOT NULL REFERENCES villages(code) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  note TEXT NOT NULL,
  confidence TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS village_assets_type_idx ON village_assets(type);

CREATE TABLE IF NOT EXISTS open_data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  license TEXT NOT NULL,
  coverage TEXT NOT NULL,
  refresh_strategy TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS administrative_areas (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  kind TEXT NOT NULL,
  parent_code TEXT,
  source_id TEXT NOT NULL REFERENCES open_data_sources(id),
  source_version TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS administrative_areas_level_idx ON administrative_areas(level);
CREATE INDEX IF NOT EXISTS administrative_areas_parent_idx ON administrative_areas(parent_code);
CREATE INDEX IF NOT EXISTS administrative_areas_name_idx ON administrative_areas(name);

CREATE TABLE IF NOT EXISTS regional_commodity_profiles (
  id TEXT PRIMARY KEY,
  area_code TEXT NOT NULL REFERENCES administrative_areas(code) ON DELETE CASCADE,
  area_level INTEGER NOT NULL CHECK (area_level BETWEEN 1 AND 4),
  area_name TEXT NOT NULL,
  province_code TEXT NOT NULL,
  province_name TEXT NOT NULL,
  commodity TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'pertanian',
  rank INTEGER NOT NULL DEFAULT 1,
  source_id TEXT NOT NULL REFERENCES open_data_sources(id),
  source_level TEXT NOT NULL,
  confidence TEXT NOT NULL,
  basis TEXT NOT NULL,
  notes TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS regional_commodity_profiles_area_idx ON regional_commodity_profiles(area_code);
CREATE INDEX IF NOT EXISTS regional_commodity_profiles_province_idx ON regional_commodity_profiles(province_code);
CREATE INDEX IF NOT EXISTS regional_commodity_profiles_commodity_idx ON regional_commodity_profiles(commodity);
CREATE INDEX IF NOT EXISTS regional_commodity_profiles_source_level_idx ON regional_commodity_profiles(source_level);

CREATE TABLE IF NOT EXISTS admin_boundary_cache (
  cache_key TEXT PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  parent_code TEXT NOT NULL DEFAULT '',
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  feature_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  note TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_boundary_cache_level_idx ON admin_boundary_cache(level, parent_code);
CREATE INDEX IF NOT EXISTS admin_boundary_cache_updated_idx ON admin_boundary_cache(updated_at DESC);

CREATE TABLE IF NOT EXISTS regional_commodity_signals (
  id TEXT PRIMARY KEY,
  area_code TEXT REFERENCES administrative_areas(code) ON DELETE SET NULL,
  area_level INTEGER CHECK (area_level BETWEEN 1 AND 4),
  area_name TEXT NOT NULL,
  province_code TEXT,
  province_name TEXT,
  commodity TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  quantity NUMERIC(18, 4),
  unit TEXT,
  period TEXT,
  headline TEXT,
  summary TEXT NOT NULL,
  source_id TEXT REFERENCES open_data_sources(id),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  confidence TEXT NOT NULL,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS regional_commodity_signals_area_idx ON regional_commodity_signals(area_code);
CREATE INDEX IF NOT EXISTS regional_commodity_signals_commodity_idx ON regional_commodity_signals(commodity);
CREATE INDEX IF NOT EXISTS regional_commodity_signals_type_idx ON regional_commodity_signals(signal_type);
CREATE INDEX IF NOT EXISTS regional_commodity_signals_updated_idx ON regional_commodity_signals(updated_at DESC);

CREATE TABLE IF NOT EXISTS data_import_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES open_data_sources(id),
  status TEXT NOT NULL,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  source_version TEXT NOT NULL,
  source_url TEXT NOT NULL,
  message TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
