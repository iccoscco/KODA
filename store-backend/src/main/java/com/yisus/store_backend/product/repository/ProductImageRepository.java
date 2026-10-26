package com.yisus.store_backend.product.repository;

import com.yisus.store_backend.product.model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    Optional<ProductImage> findByIdAndProductVariant_Product_Local_Id(Long id, Long localId);
    boolean existsByUrlAndProductVariant_Product_Local_Id(String url, Long localId);

    List<ProductImage> findByProductVariantIdOrderByIsMainDesc(Long productVariantId);
}
