package com.yisus.store_backend.product.service;

import com.yisus.store_backend.product.dto.ProductVariantCreateDTO;
import com.yisus.store_backend.product.dto.ProductVariantDTO;
import com.yisus.store_backend.product.dto.ProductVariantUpdateDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductVariantService {
    ProductVariantDTO createProductVariant(ProductVariantCreateDTO productVariantCreateDTO);
    ProductVariantDTO updateProductVariant(Long id, ProductVariantUpdateDTO productVariantUpdateDTO);
    void deleteProductVariant(Long id);
    ProductVariantDTO getProductVariantById(Long id);
    List<ProductVariantDTO> getProductVariantsByProductId(Long productId);
    List<ProductVariantDTO> getLowStockVariants(Integer minStock);
    ProductVariantDTO updateStock(Long id, Integer newStock);
    ProductVariantDTO addStock(Long id, Integer quantity);
    ProductVariantDTO subtractStock(Long id, Integer quantity);
    ProductVariantDTO uploadImages(Long variantId, MultipartFile[] files);
    void deleteProductImage(Long imageId);

    /** Marca una imagen como principal de su variante; el resto pasa a no principal. */
    ProductVariantDTO setMainProductImage(Long imageId);
}
