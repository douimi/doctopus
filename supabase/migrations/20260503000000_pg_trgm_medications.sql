-- pg_trgm for fuzzy search on medication names + DCI.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS medications_nom_trgm
  ON public.medications USING gin (nom_commercial gin_trgm_ops);

CREATE INDEX IF NOT EXISTS medications_dci_trgm
  ON public.medications USING gin (dci gin_trgm_ops);

-- Unique on the natural composite key the import upsert uses.
CREATE UNIQUE INDEX IF NOT EXISTS medications_natural_key
  ON public.medications (
    lower(nom_commercial),
    coalesce(lower(dosage), ''),
    coalesce(lower(forme), ''),
    coalesce(lower(laboratoire), '')
  );
