-- Fix: upsert_category_from_path must run as SECURITY DEFINER
-- so it can INSERT into amazon_categories (service_role-only table with RLS).
CREATE OR REPLACE FUNCTION upsert_category_from_path(
  p_name        TEXT,
  p_full_path   TEXT,
  p_marketplace marketplace DEFAULT 'US',
  p_depth       INT          DEFAULT 1,
  p_parent_path TEXT         DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id           TEXT;
  v_parent_id    TEXT;
  v_slug         TEXT;
  v_ltree_path   ltree;
  v_parent_ltree ltree;
  v_breadcrumb   TEXT[];
BEGIN
  v_id         := md5(p_marketplace::TEXT || ':' || p_full_path);
  v_slug       := slugify(p_name);
  v_breadcrumb := string_to_array(p_full_path, ' > ');

  IF p_parent_path IS NOT NULL AND p_parent_path != '' THEN
    v_parent_id := md5(p_marketplace::TEXT || ':' || p_parent_path);
    SELECT ltree_path INTO v_parent_ltree
      FROM amazon_categories WHERE id = v_parent_id;
  END IF;

  IF v_parent_ltree IS NOT NULL THEN
    v_ltree_path := v_parent_ltree || text2ltree(to_ltree_label(p_name));
  ELSE
    v_ltree_path := text2ltree(to_ltree_label(p_name));
  END IF;

  INSERT INTO amazon_categories (
    id, name, parent_id, full_path, breadcrumb, ltree_path,
    depth, is_leaf, slug, marketplace
  ) VALUES (
    v_id, p_name, v_parent_id, p_full_path, v_breadcrumb, v_ltree_path,
    p_depth, TRUE, v_slug, p_marketplace
  )
  ON CONFLICT (id) DO UPDATE SET
    name         = EXCLUDED.name,
    parent_id    = EXCLUDED.parent_id,
    full_path    = EXCLUDED.full_path,
    breadcrumb   = EXCLUDED.breadcrumb,
    ltree_path   = EXCLUDED.ltree_path,
    depth        = EXCLUDED.depth,
    slug         = EXCLUDED.slug,
    updated_at   = NOW();

  IF v_parent_id IS NOT NULL THEN
    UPDATE amazon_categories
       SET is_leaf = FALSE, updated_at = NOW()
     WHERE id = v_parent_id AND is_leaf = TRUE;
  END IF;

  RETURN v_id;
END;
$$;
