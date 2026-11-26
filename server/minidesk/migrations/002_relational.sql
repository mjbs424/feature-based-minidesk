CREATE TABLE IF NOT EXISTS minidesk_generation (
  id integer PRIMARY KEY CHECK (id = 1),
  window_start timestamptz NOT NULL,
  dataset_id uuid NOT NULL,
  write_count integer NOT NULL DEFAULT 0 CHECK (write_count >= 0)
);

CREATE TABLE IF NOT EXISTS minidesk_task_categories (
  id text PRIMARY KEY,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  is_default boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS minidesk_task_categories_label_ci
  ON minidesk_task_categories (lower(label));

CREATE TABLE IF NOT EXISTS minidesk_expense_categories (
  id text PRIMARY KEY,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  is_default boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS minidesk_expense_categories_label_ci
  ON minidesk_expense_categories (lower(label));

CREATE TABLE IF NOT EXISTS minidesk_tasks (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  category_id text NOT NULL REFERENCES minidesk_task_categories(id),
  due_date date,
  start_time time,
  end_time time,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  is_focus_priority boolean NOT NULL DEFAULT false,
  priority_selected_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK ((start_time IS NULL) = (end_time IS NULL)),
  CHECK (start_time IS NULL OR (due_date IS NOT NULL AND end_time > start_time))
);
CREATE INDEX IF NOT EXISTS minidesk_tasks_due_idx ON minidesk_tasks (due_date, start_time);
CREATE INDEX IF NOT EXISTS minidesk_tasks_category_idx ON minidesk_tasks (category_id);
CREATE INDEX IF NOT EXISTS minidesk_tasks_priority_idx
  ON minidesk_tasks (priority_selected_at) WHERE is_focus_priority AND NOT is_completed;

CREATE TABLE IF NOT EXISTS minidesk_expenses (
  id uuid PRIMARY KEY,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 160),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  category_id text NOT NULL REFERENCES minidesk_expense_categories(id),
  occurred_on date NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE INDEX IF NOT EXISTS minidesk_expenses_date_idx
  ON minidesk_expenses (occurred_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS minidesk_expenses_category_idx ON minidesk_expenses (category_id);

CREATE TABLE IF NOT EXISTS minidesk_budgets (
  month date PRIMARY KEY CHECK (extract(day from month) = 1),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  updated_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS minidesk_focus_sessions (
  id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('running', 'paused', 'completed')),
  task_id uuid REFERENCES minidesk_tasks(id) ON DELETE SET NULL,
  task_title text,
  complete_task_on_target boolean NOT NULL DEFAULT false,
  task_completion_applied boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS minidesk_one_active_focus
  ON minidesk_focus_sessions ((1)) WHERE status IN ('running', 'paused');
CREATE INDEX IF NOT EXISTS minidesk_focus_ended_idx ON minidesk_focus_sessions (ended_at DESC);

CREATE TABLE IF NOT EXISTS minidesk_focus_segments (
  session_id uuid NOT NULL REFERENCES minidesk_focus_sessions(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  PRIMARY KEY (session_id, position),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE IF NOT EXISTS minidesk_rum_events (
  event_id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('page_view', 'web_vital')),
  route text NOT NULL CHECK (route IN ('/', '/expenses', '/focus', '/real-user-monitoring')),
  occurred_at timestamptz NOT NULL,
  metric text CHECK (metric IS NULL OR metric IN ('LCP', 'INP', 'CLS')),
  value double precision,
  CHECK ((kind = 'page_view' AND metric IS NULL AND value IS NULL)
    OR (kind = 'web_vital' AND metric IS NOT NULL AND value IS NOT NULL AND value >= 0))
);
CREATE INDEX IF NOT EXISTS minidesk_rum_time_idx ON minidesk_rum_events (occurred_at);

CREATE TABLE IF NOT EXISTS minidesk_idempotency (
  scoped_key text PRIMARY KEY,
  signature text NOT NULL,
  status integer NOT NULL,
  body jsonb,
  location text
);

CREATE TABLE IF NOT EXISTS minidesk_write_ticks (
  id bigserial PRIMARY KEY,
  occurred_at_ms bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS minidesk_write_ticks_time_idx ON minidesk_write_ticks (occurred_at_ms);

-- The old singleton JSONB state held only the expiring MiniDesk demo dataset.
-- The relational API starts a fresh generation on its first request.
DROP TABLE IF EXISTS minidesk_state;
