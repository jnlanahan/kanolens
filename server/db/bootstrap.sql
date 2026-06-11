-- Bootstrap schema for dev (pglite) and first-time deploy.
-- Keep in sync with server/db/schema.ts. Drizzle generates migrations for
-- production; this SQL exists so pglite (the dev fallback) can spin up
-- without drizzle-kit.

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM (
    'draft', 'scoping', 'scoped', 'running', 'complete', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  google_sub text UNIQUE,
  name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  free_run_used boolean NOT NULL DEFAULT false,
  run_credits integer NOT NULL DEFAULT 0,
  is_admin boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS users_google_sub_idx ON users(google_sub);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled analysis',
  status session_status NOT NULL DEFAULT 'draft',
  error_message text,
  is_paid_run boolean NOT NULL DEFAULT false,
  refinements_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, created_at);

CREATE TABLE IF NOT EXISTS analyses (
  session_id uuid PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  scope jsonb,
  table_data jsonb,
  sources jsonb,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  share_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS analyses_share_token_idx ON analyses(share_token);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  created_at timestamptz NOT NULL DEFAULT now()
);
