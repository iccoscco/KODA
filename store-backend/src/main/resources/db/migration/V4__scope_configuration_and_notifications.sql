ALTER TABLE store_config ADD COLUMN IF NOT EXISTS local_id BIGINT;

UPDATE store_config config
SET local_id = store_local.id
FROM locals store_local
WHERE store_local.code = 'LOCAL-001' AND config.local_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM store_config WHERE local_id IS NULL) THEN
    RAISE EXCEPTION 'Configuración de tienda sin local; corrija los datos antes de continuar';
  END IF;
END $$;

ALTER TABLE store_config ALTER COLUMN local_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_store_config_local') THEN
    ALTER TABLE store_config
      ADD CONSTRAINT fk_store_config_local
      FOREIGN KEY (local_id) REFERENCES locals(id);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_config_local ON store_config(local_id);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS local_id BIGINT;

UPDATE notifications notification
SET local_id = app_user.local_id
FROM users app_user
WHERE notification.user_id = app_user.id AND notification.local_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_local') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_local
      FOREIGN KEY (local_id) REFERENCES locals(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_notifications_local_user_created
  ON notifications(local_id, user_id, created_at DESC);
