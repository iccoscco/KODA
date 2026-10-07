package com.yisus.store_backend.product.service.Impl;

import com.yisus.store_backend.product.dto.ProductCreateDTO;
import com.yisus.store_backend.product.dto.ProductDTO;
import com.yisus.store_backend.product.dto.ProductImageDTO;
import com.yisus.store_backend.product.dto.ProductUpdateDTO;
import com.yisus.store_backend.product.dto.ProductVariantDTO;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductImage;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.service.ProductService;
import com.yisus.store_backend.category.model.Category;
import com.yisus.store_backend.category.repository.CategoryRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductServiceImpl implements ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductVariantRepository productVariantRepository;

    @Override
    @Transactional
    public ProductDTO createProduct(ProductCreateDTO request) {
        // Bug #6 fix: validar que el descuento esté entre 0 y 100 ANTES de guardar
        if (request.getDiscountPercentage() != null) {
            validateDiscountPercentage(request.getDiscountPercentage());
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // Si ya existe un producto con ese nombre, decidir según su estado:
        // - Activo  -> duplicado real, rechazar.
        // - Inactivo (soft-deleted) -> reactivar con los nuevos datos para evitar
        //   chocar con la restricción UNIQUE en la columna name.
        var existingOpt = productRepository.findByName(request.getName());
        if (existingOpt.isPresent()) {
            Product existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new DuplicateKeyException("Product already exists");
            }

            existing.setPurchasePrice(request.getPurchasePrice());
            existing.setSalePrice(request.getSalePrice());
            existing.setDiscountPercentage(request.getDiscountPercentage());
            existing.setDiscountStart(request.getDiscountStart());
            existing.setDiscountEnd(request.getDiscountEnd());
            existing.setIsFeatured(request.getIsFeatured());
            existing.setTotalSold(0L);
            existing.setCategory(category);
            existing.setMinStock(request.getMinStock());
            existing.setIsActive(true);

            Product reactivated = productRepository.save(existing);
            productRepository.flush();
            log.info("Product '{}' reactivated and updated successfully", reactivated.getName());
            return convertToDTO(reactivated);
        }

        Product product = Product.builder()
                .name(request.getName())
                .purchasePrice(request.getPurchasePrice())
                .salePrice(request.getSalePrice())
                .discountPercentage(request.getDiscountPercentage())
                .discountStart(request.getDiscountStart())
                .discountEnd(request.getDiscountEnd())
                .isFeatured(request.getIsFeatured())
                .totalSold(0L)
                .category(category)
                .minStock(request.getMinStock())
                .isActive(true)
                .build();

        Product savedProduct = productRepository.save(product);
        productRepository.flush();
        log.info("Product '{}' created successfully", savedProduct.getName());

        return convertToDTO(savedProduct);
    }



    // Bug #6 fix: método de validación de porcentaje de descuento
    private void validateDiscountPercentage(java.math.BigDecimal discount) {
        if (discount.compareTo(java.math.BigDecimal.ZERO) < 0
                || discount.compareTo(java.math.BigDecimal.valueOf(100)) > 0) {
            throw new RuntimeException("Discount percentage must be between 0 and 100");
        }
    }




    @Override
    @Transactional
    public ProductDTO updateProduct(Long id, ProductUpdateDTO productUpdateDTO) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if(productUpdateDTO.getName() != null){
            productRepository.findByName(productUpdateDTO.getName())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new DuplicateKeyException("Product already exists");
                        }
                    });
            product.setName(productUpdateDTO.getName());
        }

        if(productUpdateDTO.getPurchasePrice() != null){
            product.setPurchasePrice(productUpdateDTO.getPurchasePrice());
        }
        if(productUpdateDTO.getSalePrice() != null){
            product.setSalePrice(productUpdateDTO.getSalePrice());
        }
        if(productUpdateDTO.getDiscountPercentage() != null){
            validateDiscountPercentage(productUpdateDTO.getDiscountPercentage());
            product.setDiscountPercentage(productUpdateDTO.getDiscountPercentage());
        }
        if(productUpdateDTO.getDiscountStart() != null){
            product.setDiscountStart(productUpdateDTO.getDiscountStart());
        }
        if(productUpdateDTO.getDiscountEnd() != null){
            product.setDiscountEnd(productUpdateDTO.getDiscountEnd());
        }
        if(productUpdateDTO.getIsFeatured() != null) {
            product.setIsFeatured(productUpdateDTO.getIsFeatured());
        }
        if(productUpdateDTO.getCategoryId() != null){
            Category category = categoryRepository.findById(productUpdateDTO.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            product.setCategory(category);
        }
        if(productUpdateDTO.getMinStock() != null){
            product.setMinStock(productUpdateDTO.getMinStock());
        }
        productRepository.save(product);
        productRepository.flush();

        Product refreshed = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return convertToDTO(refreshed);
    }

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Desactivar todas las variantes del producto para evitar variantes huérfanas.
        // Además, liberar el SKU (columna UNIQUE) para que pueda reutilizarse al crear
        // una nueva variante con ese mismo código más tarde. Preservamos el valor
        // anterior como histórico en el propio registro renombrándolo con un prefijo.
        List<ProductVariant> variants = productVariantRepository.findByProductId(id);
        if (!variants.isEmpty()) {
            long ts = System.currentTimeMillis();
            variants.forEach(v -> {
                v.setIsActive(false);
                String currentSku = v.getSku();
                if (currentSku != null && !currentSku.isBlank()
                        && !currentSku.startsWith("DEL_")) {
                    v.setSku("DEL_" + ts + "_" + v.getId() + "_" + currentSku);
                }
            });
            productVariantRepository.saveAll(variants);
            productVariantRepository.flush();
            log.info("Deactivated {} variant(s) for product '{}'", variants.size(), product.getName());
        }

        product.setIsActive(false);
        productRepository.save(product);
        log.info("Product '{}' deleted (deactivated) successfully", product.getName());
    }

    @Override
    @Transactional
    public void updateProductStatus(Long id, Boolean productUpdateStatusDTO) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        product.setIsActive(productUpdateStatusDTO);
        productRepository.save(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return convertToDTO(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getAllProducts(String search) {
        if(search == null || search.trim().isEmpty()){
            return productRepository.findAllByIsActiveTrue().stream()
                    .map(this::convertToDTO)
                    .toList();
        }
        return productRepository.findBySearch(search).stream().map(this::convertToDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getAllProductsPaginated(String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return productRepository.findAllByIsActiveTrue(pageable).map(this::convertToDTO);
        } else {
            return productRepository.findBySearch(search, pageable).map(this::convertToDTO);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsByCategoryId(Long categoryId) {
        return productRepository.findAllByCategoryIdAndIsActiveTrue(categoryId).stream()
                .map(this::convertToDTO)
                .toList();
    }

    private ProductDTO convertToDTO(Product product) {
        // Cargar variantes del producto con sus imágenes
        List<ProductVariant> variants = productVariantRepository.findActiveByProductId(product.getId());
        
        List<ProductVariantDTO> variantDTOs = variants.stream()
                .map(this::convertVariantToDTO)
                .toList();

        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .purchasePrice(product.getPurchasePrice())
                .salePrice(product.getSalePrice())
                .discountPercentage(product.getDiscountPercentage())
                .discountStart(product.getDiscountStart())
                .discountEnd(product.getDiscountEnd())
                .isFeatured(product.getIsFeatured())
                .totalSold(product.getTotalSold())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .minStock(product.getMinStock())
                .isActive(product.getIsActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .variants(variantDTOs)
                .build();
    }
    

    
    private ProductVariantDTO convertVariantToDTO(ProductVariant variant) {
        // Cargar imágenes de esta variante
        List<ProductImageDTO> images = productImageRepository.findByProductVariantIdOrderByIsMainDesc(variant.getId())
                .stream()
                .map(image -> ProductImageDTO.builder()
                        .id(image.getId())
                        .productId(variant.getProduct().getId())  // ← ID del producto, no de la variante
                        .url(image.getUrl())
                        .isMain(image.getIsMain())
                        .createdAt(image.getCreatedAt())
                        .build())
                .toList();

        return ProductVariantDTO.builder()
                .id(variant.getId())
                .productId(variant.getProduct().getId())
                .productName(variant.getProduct().getName())
                .colorId(variant.getColor() != null ? variant.getColor().getId() : null)
                .colorName(variant.getColor() != null ? variant.getColor().getName() : null)
                .colorHexCode(variant.getColor() != null ? variant.getColor().getHexCode() : null)
                .sizeId(variant.getSize() != null ? variant.getSize().getId() : null)
                .sizeName(variant.getSize() != null ? variant.getSize().getName() : null)
                .stock(variant.getStock())
                .minStock(variant.getMinStock())
                .sku(variant.getSku())
                .salePrice(variant.getSalePrice())
                .purchasePrice(variant.getPurchasePrice())
                .isActive(variant.getIsActive())
                .images(images)
                .createdAt(variant.getCreatedAt())
                .updatedAt(variant.getUpdatedAt())
                .build();
    }
}
