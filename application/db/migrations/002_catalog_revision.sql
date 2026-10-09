-- Any SQL writer must invalidate the API snapshot, including direct updates.
CREATE FUNCTION beer_map_touch_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER beer_map_catalog_revision
BEFORE UPDATE ON beer_map_catalog
FOR EACH ROW EXECUTE FUNCTION beer_map_touch_catalog();
