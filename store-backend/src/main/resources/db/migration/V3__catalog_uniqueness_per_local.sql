-- Un mismo nombre/SKU puede existir en distintos locales; dentro de uno es único.
-- Las variantes guardan local_id para que la BD pueda imponer esta regla y
-- comprobar con FK compuesta que coincide con el local de su producto.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS local_id BIGINT;

UPDATE product_variants pv SET local_id = p.local_id
FROM products p
WHERE pv.product_id = p.id AND pv.local_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM product_variants pv
      LEFT JOIN products p ON p.id = pv.product_id
      WHERE pv.local_id IS NULL OR p.id IS NULL OR pv.local_id IS DISTINCT FROM p.local_id
  ) THEN
    RAISE EXCEPTION 'Variantes sin producto/local o con local inconsistente';
  END IF;
END $$;

ALTER TABLE product_variants ALTER COLUMN local_id SET NOT NULL;

-- PostgreSQL exige una clave única exacta en las columnas referenciadas.
ALTER TABLE products ADD CONSTRAINT uq_products_id_local UNIQUE (id, local_id);
ALTER TABLE product_variants ADD CONSTRAINT fk_product_variants_product_local
    FOREIGN KEY (product_id, local_id) REFERENCES products (id, local_id);

-- Los nombres de las constraints de Hibernate pueden variar entre instalaciones.
-- Retirar solo la unicidad heredada de una columna, nunca la PK ni otras reglas.
DO $$
DECLARE legacy_constraint RECORD;
BEGIN
  FOR legacy_constraint IN
      SELECT c.conrelid::regclass AS table_name, c.conname
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid
          AND c.conkey = ARRAY[a.attnum]::smallint[]
      WHERE c.contype = 'u'
        AND ((c.conrelid = 'categories'::regclass AND a.attname = 'name')
          OR (c.conrelid = 'products'::regclass AND a.attname = 'name')
          OR (c.conrelid = 'product_variants'::regclass AND a.attname = 'sku'))
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', legacy_constraint.table_name, legacy_constraint.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX uq_categories_local_name ON categories (local_id, name);
CREATE UNIQUE INDEX uq_products_local_name ON products (local_id, name);
-- PostgreSQL permite varios SKU NULL; un SKU informado es único en su local.
CREATE UNIQUE INDEX uq_product_variants_local_sku ON product_variants (local_id, sku);
