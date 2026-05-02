CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
  ON users (lower(username));

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS profile_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  duration integer NOT NULL DEFAULT 0 CHECK (duration IN (0, 60, 180)),
  sound_enabled boolean NOT NULL DEFAULT false,
  auto_next boolean NOT NULL DEFAULT false,
  auto_next_delay_ms integer NOT NULL DEFAULT 900 CHECK (auto_next_delay_ms BETWEEN 500 AND 3000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  prompt text NOT NULL,
  accuracy integer NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  wpm integer NOT NULL CHECK (wpm >= 0),
  cpm integer NOT NULL CHECK (cpm >= 0),
  error_count integer NOT NULL CHECK (error_count >= 0),
  elapsed_seconds double precision NOT NULL CHECK (elapsed_seconds >= 0),
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_results_user_completed_idx
  ON practice_results(user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS custom_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_prompts_user_created_idx
  ON custom_prompts(user_id, created_at DESC);
