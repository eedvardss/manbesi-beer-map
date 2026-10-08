CREATE TABLE beer_map_catalog (
  id TEXT PRIMARY KEY CHECK (id = 'published'),
  payload TEXT NOT NULL CHECK (
    COALESCE((payload::jsonb ->> 'schemaVersion') = '1'
    AND jsonb_typeof(payload::jsonb -> 'venues') = 'array', false)
  ),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
