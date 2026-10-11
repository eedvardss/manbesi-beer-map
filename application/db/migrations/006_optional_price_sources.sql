-- Administrators may verify prices in person without a web link. Preserve
-- approval history, dates, serving locks, conflicts and restricted privileges.
CREATE OR REPLACE FUNCTION beer_map_review_price(identifier UUID, decision TEXT, source_link TEXT, observation DATE, actor TEXT) RETURNS void
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
    source_link := coalesce(btrim(source_link), '');
    IF (source_link <> '' AND source_link !~ '^https?://') OR length(source_link)>1000 OR observation IS NULL OR observation>current_date THEN
      RAISE EXCEPTION 'invalid source or observation date' USING ERRCODE='P0400';
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

