package com.yisus.store_backend.storeconfig.bootstrap;

import com.yisus.store_backend.local.model.Local;
import com.yisus.store_backend.local.repository.LocalRepository;
import com.yisus.store_backend.storeconfig.model.StoreConfig;
import com.yisus.store_backend.storeconfig.repository.StoreConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea la fila singleton de configuración de tienda si no existe todavía.
 * Se ejecuta después de DataInitializer (order 5 implícito) y CashBootstraps.
 */
@Component
@Order(20)
@RequiredArgsConstructor
@Slf4j
public class StoreConfigBootstrap implements ApplicationRunner {

    private final StoreConfigRepository storeConfigRepository;
    private final LocalRepository localRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Local local : localRepository.findAll()) {
            if (storeConfigRepository.existsByLocal_Id(local.getId())) {
                continue;
            }
            storeConfigRepository.save(StoreConfig.builder()
                    .id(local.getId())
                    .local(local)
                    .storeName("Mi Tienda")
                    .storeRuc("")
                    .storeAddress("")
                    .build());
            log.info("Configuración de tienda inicial creada para local {}", local.getCode());
        }
    }
}
