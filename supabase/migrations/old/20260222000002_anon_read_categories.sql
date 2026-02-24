-- Allow anon role to read from global catalog tables.
-- These are non-sensitive, public reference data.
-- Required by: setup-embeddings.js, anonymously fetching categories for embedding.

CREATE POLICY "amazon_categories: read anon"
  ON amazon_categories FOR SELECT
  TO anon
  USING (TRUE);

CREATE POLICY "category_embeddings: read anon"
  ON category_embeddings FOR SELECT
  TO anon
  USING (TRUE);
