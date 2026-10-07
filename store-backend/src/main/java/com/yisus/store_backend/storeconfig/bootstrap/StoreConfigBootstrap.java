package com.yisus.store_backend.storeconfig.bootstrap;

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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!storeConfigRepository.existsById(StoreConfig.SINGLETON_ID)) {
            storeConfigRepository.save(
                    StoreConfig.builder()
                            .id(StoreConfig.SINGLETON_ID)
                            .storeName("Mi Tienda")
                            .storeRuc("")
                            .storeAddress("")
                            .build()
            );
            log.info("Configuración de tienda inicial creada (id=1)");
        }
    }
}
