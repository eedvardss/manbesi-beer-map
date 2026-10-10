-- Application permissions only. Clerk owns passwords, factors and sessions.
CREATE TABLE beer_map_admins (
  clerk_user_id TEXT PRIMARY KEY CHECK (clerk_user_id ~ '^user_[A-Za-z0-9]+$'),
  active BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON beer_map_admins FROM PUBLIC;
