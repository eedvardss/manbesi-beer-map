ALTER TABLE beer_map_catalog ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;

CREATE TABLE beer_map_servings (
  id UUID PRIMARY KEY, venue_id TEXT NOT NULL, venue_name TEXT NOT NULL,
  beer_name TEXT NOT NULL, volume_ml INTEGER, package_count INTEGER NOT NULL,
  price_is_from BOOLEAN NOT NULL, baseline_cents INTEGER NOT NULL CHECK (baseline_cents >= 0),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0), active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE beer_map_price_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), serving_id UUID NOT NULL REFERENCES beer_map_servings(id),
  reporter TEXT NOT NULL, request_id UUID NOT NULL UNIQUE,
  expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
  old_cents INTEGER NOT NULL, proposed_cents INTEGER NOT NULL CHECK (proposed_cents BETWEEN 1 AND 50000),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  evidence_url TEXT NOT NULL DEFAULT '' CHECK (length(evidence_url) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ, reviewer TEXT
);
CREATE INDEX beer_map_pending_prices ON beer_map_price_suggestions(created_at, id) WHERE status = 'pending';
CREATE INDEX beer_map_suggestion_serving ON beer_map_price_suggestions(serving_id);
CREATE TABLE beer_map_current_prices (
  serving_id UUID PRIMARY KEY REFERENCES beer_map_servings(id),
  price_cents INTEGER NOT NULL CHECK (price_cents BETWEEN 1 AND 50000),
  suggestion_id UUID NOT NULL REFERENCES beer_map_price_suggestions(id),
  evidence_url TEXT NOT NULL, observed_on DATE NOT NULL, published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE beer_map_price_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), serving_id UUID NOT NULL REFERENCES beer_map_servings(id),
  version INTEGER NOT NULL, action TEXT NOT NULL CHECK (action IN ('approve','revert')),
  old_cents INTEGER NOT NULL, new_cents INTEGER NOT NULL, previous_override JSONB,
  reviewer TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(serving_id, version)
);
CREATE TABLE beer_map_price_limits (
  bucket TEXT NOT NULL, hour TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL,
  PRIMARY KEY(bucket, hour)
);

-- Called only by the controlled entry points below. Locks serialize quotas
-- across app replicas, and old pseudonymous buckets expire after 48 hours.
CREATE FUNCTION beer_map_take_price_limit(bucket_name TEXT, maximum INTEGER) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE count_now INTEGER;
BEGIN
  DELETE FROM public.beer_map_price_limits WHERE hour < date_trunc('hour', now()) - interval '48 hours';
  INSERT INTO public.beer_map_price_limits(bucket,hour,attempts)
    VALUES(bucket_name,date_trunc('hour',now()),1)
    ON CONFLICT(bucket,hour) DO UPDATE SET attempts=beer_map_price_limits.attempts+1
    RETURNING attempts INTO count_now;
  IF count_now > maximum THEN RAISE EXCEPTION 'price rate limit' USING ERRCODE='P0429'; END IF;
END;
$$;

CREATE FUNCTION beer_map_submit_price(target UUID, amount INTEGER, wanted_version INTEGER,
  reporter_key TEXT, retry_key UUID, comment_text TEXT, source_link TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE existing public.beer_map_price_suggestions; serving public.beer_map_servings; identifier UUID; current_amount INTEGER;
BEGIN
  IF target IS NULL OR amount IS NULL OR wanted_version IS NULL OR retry_key IS NULL
     OR reporter_key IS NULL OR comment_text IS NULL OR source_link IS NULL
     OR length(reporter_key) <> 64 OR length(comment_text) > 500 OR length(source_link) > 1000
     OR amount NOT BETWEEN 1 AND 50000 OR wanted_version < 0 THEN
    RAISE EXCEPTION 'invalid suggestion' USING ERRCODE='P0400';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(retry_key::text, 0));
  SELECT * INTO existing FROM public.beer_map_price_suggestions WHERE request_id=retry_key;
  IF FOUND THEN
    IF existing.reporter <> reporter_key OR existing.serving_id <> target OR existing.proposed_cents <> amount
       OR existing.expected_version <> wanted_version OR existing.note <> comment_text OR existing.evidence_url <> source_link THEN
      RAISE EXCEPTION 'retry conflict' USING ERRCODE='P0409';
    END IF;
    RETURN jsonb_build_object('id',existing.id,'status',existing.status,'duplicate',true);
  END IF;
  SELECT * INTO serving FROM public.beer_map_servings WHERE id=target AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing serving' USING ERRCODE='P0404'; END IF;
  IF serving.version <> wanted_version THEN RAISE EXCEPTION 'stale price' USING ERRCODE='P0409'; END IF;
  SELECT coalesce(p.price_cents,serving.baseline_cents) INTO current_amount
    FROM (SELECT 1) control LEFT JOIN public.beer_map_current_prices p ON p.serving_id=target;
  IF current_amount=amount THEN RAISE EXCEPTION 'unchanged price' USING ERRCODE='P0400'; END IF;
  PERFORM public.beer_map_take_price_limit('submit:global',120);
  PERFORM public.beer_map_take_price_limit('submit:' || reporter_key,10);
  INSERT INTO public.beer_map_price_suggestions(serving_id,reporter,request_id,expected_version,old_cents,proposed_cents,note,evidence_url)
    VALUES(target,reporter_key,retry_key,wanted_version,current_amount,amount,comment_text,source_link) RETURNING id INTO identifier;
  RETURN jsonb_build_object('id',identifier,'status','pending','duplicate',false);
END;
$$;

CREATE FUNCTION beer_map_review_price(identifier UUID, decision TEXT, source_link TEXT, observation DATE, actor TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE suggestion public.beer_map_price_suggestions; serving public.beer_map_servings; previous JSONB; current_amount INTEGER;
BEGIN
  IF identifier IS NULL OR decision IS NULL OR actor IS NULL
     OR decision NOT IN ('approve','reject') OR length(actor) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'invalid review' USING ERRCODE='P0400';
  END IF;
  SELECT * INTO suggestion FROM public.beer_map_price_suggestions WHERE id=identifier FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing suggestion' USING ERRCODE='P0404'; END IF;
  IF suggestion.status <> 'pending' THEN RAISE EXCEPTION 'already reviewed' USING ERRCODE='P0409'; END IF;
  IF decision='approve' THEN
    IF source_link IS NULL OR source_link !~ '^https?://' OR length(source_link)>1000 OR observation IS NULL OR observation>current_date THEN
      RAISE EXCEPTION 'verified source required' USING ERRCODE='P0400';
    END IF;
    SELECT * INTO serving FROM public.beer_map_servings WHERE id=suggestion.serving_id AND active FOR UPDATE;
    IF NOT FOUND OR serving.version <> suggestion.expected_version THEN RAISE EXCEPTION 'stale price' USING ERRCODE='P0409'; END IF;
    SELECT to_jsonb(p),p.price_cents INTO previous,current_amount FROM public.beer_map_current_prices p WHERE p.serving_id=serving.id;
    INSERT INTO public.beer_map_price_changes(serving_id,version,action,old_cents,new_cents,previous_override,reviewer)
      VALUES(serving.id,serving.version+1,'approve',coalesce(current_amount,serving.baseline_cents),suggestion.proposed_cents,previous,actor);
    INSERT INTO public.beer_map_current_prices(serving_id,price_cents,suggestion_id,evidence_url,observed_on)
      VALUES(serving.id,suggestion.proposed_cents,identifier,source_link,observation)
      ON CONFLICT(serving_id) DO UPDATE SET price_cents=excluded.price_cents,suggestion_id=excluded.suggestion_id,
        evidence_url=excluded.evidence_url,observed_on=excluded.observed_on,published_at=now();
    UPDATE public.beer_map_servings SET version=version+1 WHERE id=serving.id;
    UPDATE public.beer_map_catalog SET revision=revision+1 WHERE id='published';
  END IF;
  UPDATE public.beer_map_price_suggestions SET status=CASE decision WHEN 'approve' THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),reviewer=actor WHERE id=identifier;
END;
$$;

CREATE FUNCTION beer_map_revert_price(target UUID, wanted_version INTEGER, actor TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE serving public.beer_map_servings; change public.beer_map_price_changes; previous JSONB; restored_amount INTEGER;
BEGIN
  IF target IS NULL OR wanted_version IS NULL OR actor IS NULL OR wanted_version<0
     OR length(actor) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'invalid actor' USING ERRCODE='P0400'; END IF;
  SELECT * INTO serving FROM public.beer_map_servings WHERE id=target AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing serving' USING ERRCODE='P0404'; END IF;
  IF serving.version <> wanted_version THEN RAISE EXCEPTION 'stale price' USING ERRCODE='P0409'; END IF;
  -- Undo the approval that produced the current override, including an older
  -- override restored by a previous reversal. Never reverse a reversal into a
  -- redo loop. The serving lock and wanted_version still guard concurrent edits.
  SELECT h.* INTO change FROM public.beer_map_price_changes h
    JOIN public.beer_map_current_prices p ON p.serving_id=h.serving_id
    JOIN public.beer_map_price_suggestions r ON r.id=p.suggestion_id
    WHERE h.serving_id=target AND h.version=r.expected_version+1 AND h.action='approve';
  IF NOT FOUND THEN RAISE EXCEPTION 'missing history' USING ERRCODE='P0404'; END IF;
  SELECT to_jsonb(p) INTO previous FROM public.beer_map_current_prices p WHERE p.serving_id=target;
  restored_amount=coalesce((change.previous_override->>'price_cents')::integer,serving.baseline_cents);
  INSERT INTO public.beer_map_price_changes(serving_id,version,action,old_cents,new_cents,previous_override,reviewer)
    VALUES(target,wanted_version+1,'revert',(previous->>'price_cents')::integer,restored_amount,previous,actor);
  IF change.previous_override IS NULL THEN DELETE FROM public.beer_map_current_prices WHERE serving_id=target;
  ELSE
    INSERT INTO public.beer_map_current_prices SELECT (jsonb_populate_record(NULL::public.beer_map_current_prices,change.previous_override)).*
      ON CONFLICT(serving_id) DO UPDATE SET price_cents=excluded.price_cents,suggestion_id=excluded.suggestion_id,
        evidence_url=excluded.evidence_url,observed_on=excluded.observed_on,published_at=excluded.published_at;
  END IF;
  UPDATE public.beer_map_servings SET version=version+1 WHERE id=target;
  UPDATE public.beer_map_catalog SET revision=revision+1 WHERE id='published';
END;
$$;

CREATE FUNCTION beer_map_price_login_limit() RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$ SELECT public.beer_map_take_price_limit('login:global',30) $$;

REVOKE ALL ON FUNCTION beer_map_take_price_limit(TEXT,INTEGER),
  beer_map_submit_price(UUID,INTEGER,INTEGER,TEXT,UUID,TEXT,TEXT),
  beer_map_review_price(UUID,TEXT,TEXT,DATE,TEXT), beer_map_revert_price(UUID,INTEGER,TEXT),
  beer_map_price_login_limit() FROM PUBLIC;
