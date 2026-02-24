-- Replace the row-by-row loop with a single set-based INSERT ... SELECT
-- and set statement_timeout = 0 so bulk inserts never time out.

CREATE OR REPLACE FUNCTION upsert_embeddings_batch(p_records JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = 0
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH parsed AS (
    SELECT
      (r->>'category_id')                                       AS category_id,
      COALESCE(r->>'model', 'text-embedding-3-small')           AS model,
      (   '['
       || (SELECT string_agg(v::text, ',')
             FROM jsonb_array_elements_text(r->'embedding') AS v)
       || ']'
      )::vector(1536)                                           AS embedding,
      (r->>'source_text')                                       AS source_text
    FROM jsonb_array_elements(p_records) AS r
  )
  INSERT INTO category_embeddings (category_id, model, embedding, source_text)
  SELECT category_id, model, embedding, source_text
  FROM   parsed
  ON CONFLICT (category_id, model) DO UPDATE SET
    embedding   = EXCLUDED.embedding,
    source_text = EXCLUDED.source_text;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION upsert_embeddings_batch(JSONB) IS
  'Batch-upsert category embeddings (set-based, no statement timeout). SECURITY DEFINER.';
