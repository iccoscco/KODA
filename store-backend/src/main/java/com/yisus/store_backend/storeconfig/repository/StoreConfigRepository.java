package com.yisus.store_backend.storeconfig.repository;

import com.yisus.store_backend.storeconfig.model.StoreConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreConfigRepository extends JpaRepository<StoreConfig, Long> {
    java.util.Optional<StoreConfig> findByLocal_Id(Long localId);
    boolean existsByLocal_Id(Long localId);
    boolean existsByLogoUrlAndLocal_Id(String logoUrl, Long localId);
}
