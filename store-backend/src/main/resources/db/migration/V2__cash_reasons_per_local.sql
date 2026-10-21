-- Los motivos de egreso son configuración operativa; no deben compartirse entre locales.
ALTER TABLE outflow_reasons ADD COLUMN IF NOT EXISTS local_id BIGINT;
UPDATE outflow_reasons SET local_id = (SELECT id FROM locals WHERE code = 'LOCAL-001') WHERE local_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM outflow_reasons WHERE local_id IS NULL)
     OR EXISTS (SELECT 1 FROM cash_outflows co JOIN outflow_reasons r ON r.id = co.reason_id
                WHERE co.local_id <> r.local_id)
  THEN
    RAISE EXCEPTION 'Motivos de egreso inconsistentes entre locales';
  END IF;
END $$;

ALTER TABLE outflow_reasons ALTER COLUMN local_id SET NOT NULL;
ALTER TABLE outflow_reasons DROP CONSTRAINT IF EXISTS ukk1lju76eyg33yc9mb8rsuf4al;
CREATE UNIQUE INDEX IF NOT EXISTS uq_outflow_reasons_local_name ON outflow_reasons(local_id, name);
