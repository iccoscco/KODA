package com.yisus.store_backend.order.bootstrap;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Asegura columnas de costo en order_items sin NOT NULL (filas históricas existentes).
 * Hibernate ddl-auto falla al agregar boolean NOT NULL sobre datos previos.
 */
@Component
@Order(19)
@RequiredArgsConstructor
@Slf4j
public class OrderItemSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute(
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2)");
        jdbcTemplate.execute(
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS purchase_price_estimated BOOLEAN");
        log.debug("Esquema order_items verificado (purchase_price, purchase_price_estimated)");
    }
}
