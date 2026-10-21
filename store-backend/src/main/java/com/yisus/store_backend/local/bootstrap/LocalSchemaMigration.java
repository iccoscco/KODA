package com.yisus.store_backend.local.bootstrap;

import lombok.RequiredArgsConstructor;
import org.flywaydb.core.Flyway;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * El proyecto legado usa Hibernate ddl-auto=update. Se ejecuta Flyway después
 * de la creación del esquema heredado y antes de cualquier bootstrap de datos.
 * Solo las modificaciones nuevas se gestionan mediante migraciones versionadas.
 */
@Component
@Order(-100)
@RequiredArgsConstructor
public class LocalSchemaMigration implements ApplicationRunner {
    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .cleanDisabled(true)
                .load()
                .migrate();
    }
}
