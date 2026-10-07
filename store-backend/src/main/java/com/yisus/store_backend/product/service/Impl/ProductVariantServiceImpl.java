package com.yisus.store_backend.product.service.Impl;

import com.yisus.store_backend.common.exception.DuplicateResourceException;
import com.yisus.store_backend.product.dto.ProductVariantCreateDTO;
import com.yisus.store_backend.product.dto.ProductVariantDTO;
import com.yisus.store_backend.product.dto.ProductVariantUpdateDTO;
import com.yisus.store_backend.product.model.Color;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductImage;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.model.Size;
import com.yisus.store_backend.product.repository.ColorRepository;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.repository.SizeRepository;
import com.yisus.store_backend.product.service.ProductVariantService;
import com.yisus.store_backend.product.service.StockMovementService;
import com.yisus.store_backend.product.model.StockMovement.MovementType;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductVariantServiceImpl implements ProductVariantService {
    
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final ColorRepository colorRepository;
    private final SizeRepository sizeRepository;
    private final ProductImageRepository productImageRepository;
    private final StockMovementService stockMovementService;
    
    @Override
    @Transactional
    public ProductVariantDTO createProductVariant(ProductVariantCreateDTO dto) {
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Color color = null;
        if (dto.getColorId() != null) {
            color = colorRepository.findById(dto.getColorId())
                    .orElseThrow(() -> new RuntimeException("Color not found"));
        }

        Size size = null;
        if (dto.getSizeId() != null) {
            size = sizeRepository.findById(dto.getSizeId())
                    .orElseThrow(() -> new RuntimeException("Size not found"));
        }

        boolean activeComboExists = productVariantRepository
                .findActiveByProductIdAndOptionalColorIdAndOptionalSizeId(
                        dto.getProductId(), dto.getColorId(), dto.getSizeId())
                .isPresent();

        if (activeComboExists) {
            throw new DuplicateResourceException("Ya existe una variante activa con esa combinación de color y talla");
        }

        if (dto.getSku() != null && productVariantRepository.existsBySku(dto.getSku())) {
            throw new RuntimeException("SKU already exists");
        }

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .color(color)
                .size(size)
                .stock(dto.getStock() != null ? dto.getStock() : 0)
                .minStock(dto.getMinStock() != null ? dto.getMinStock() : 0)
                .sku(dto.getSku())
                .salePrice(dto.getSalePrice())
                .purchasePrice(dto.getPurchasePrice())
                .build();

        ProductVariant savedVariant = productVariantRepository.save(variant);
        productVariantRepository.flush();
        if (savedVariant.getStock() > 0) {
            stockMovementService.registerMovement(savedVariant, savedVariant.getStock(), MovementType.INPUT, "MANUAL_ADD");
        }
        return convertToDTO(savedVariant);
    }

    @Override
    @Transactional
    public ProductVariantDTO updateProductVariant(Long id, ProductVariantUpdateDTO dto) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));

        // Validar combinación única en variantes del mismo producto
        Optional<ProductVariant> duplicateOpt = productVariantRepository
                .findActiveByProductIdAndOptionalColorIdAndOptionalSizeId(
                        variant.getProduct().getId(), dto.getColorId(), dto.getSizeId());

        if (duplicateOpt.isPresent() && !duplicateOpt.get().getId().equals(id)) {
            throw new DuplicateResourceException("Ya existe una variante activa con esa combinación de color y talla");
        }
        
        if (dto.getStock() != null) {
            if (dto.getStock() < 0) {
                throw new RuntimeException("Stock cannot be negative");
            }
            int oldStock = variant.getStock();
            int newStock = dto.getStock();
            if (newStock != oldStock) {
                variant.setStock(newStock);
                int diff = newStock - oldStock;
                MovementType type = diff > 0 ? MovementType.INPUT : MovementType.OUTPUT;
                stockMovementService.registerMovement(variant, Math.abs(diff), type, "STOCK_UPDATE");
            }
        }

        if (dto.getMinStock() != null) {
            if (dto.getMinStock() < 0) {
                throw new RuntimeException("El stock mínimo no puede ser negativo");
            }
            variant.setMinStock(dto.getMinStock());
        }

        if (dto.getSku() != null) {
            if (!dto.getSku().equals(variant.getSku()) && 
                productVariantRepository.existsBySku(dto.getSku())) {
                throw new RuntimeException("SKU already exists");
            }
            variant.setSku(dto.getSku());
        }

        // Actualizar color
        if (dto.getColorId() != null) {
            Color color = colorRepository.findById(dto.getColorId())
                    .orElseThrow(() -> new RuntimeException("Color not found"));
            variant.setColor(color);
        } else {
            variant.setColor(null);
        }

        // Actualizar talla
        if (dto.getSizeId() != null) {
            Size size = sizeRepository.findById(dto.getSizeId())
                    .orElseThrow(() -> new RuntimeException("Size not found"));
            variant.setSize(size);
        } else {
            variant.setSize(null);
        }

        // Para salePrice/purchasePrice se escribe siempre lo que venga en el DTO,
        // incluido {@code null}, que significa "borrar el override y volver a heredar
        // del producto". El frontend envía siempre ambos campos en la actualización.
        variant.setSalePrice(dto.getSalePrice());
        variant.setPurchasePrice(dto.getPurchasePrice());

        ProductVariant savedVariant = productVariantRepository.save(variant);
        productVariantRepository.flush();
        return convertToDTO(savedVariant);
    }
    
    @Override
    @Transactional
    public void deleteProductVariant(Long id) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));
        variant.setIsActive(false);
        productVariantRepository.save(variant);
    }
    
    @Override
    @Transactional(readOnly = true)
    public ProductVariantDTO getProductVariantById(Long id) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));
        return convertToDTO(variant);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ProductVariantDTO> getProductVariantsByProductId(Long productId) {
        List<ProductVariant> variants = productVariantRepository.findActiveByProductId(productId);
        return variants.stream()
                .map(this::convertToDTO)
                .toList();
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ProductVariantDTO> getLowStockVariants(Integer minStock) {
        List<ProductVariant> variants = productVariantRepository.findLowStock(minStock);
        return variants.stream()
                .map(this::convertToDTO)
                .toList();
    }
    
    @Override
    @Transactional
    public ProductVariantDTO updateStock(Long id, Integer newStock) {
        if (newStock < 0) {
            throw new RuntimeException("Stock cannot be negative");
        }
        
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));
        
        int oldStock = variant.getStock();
        if (newStock != oldStock) {
            variant.setStock(newStock);
            int diff = newStock - oldStock;
            MovementType type = diff > 0 ? MovementType.INPUT : MovementType.OUTPUT;
            stockMovementService.registerMovement(variant, Math.abs(diff), type, "STOCK_UPDATE");
        }
        ProductVariant savedVariant = productVariantRepository.save(variant);
        productVariantRepository.flush();
        return convertToDTO(savedVariant);
    }
    
    @Override
    @Transactional
    public ProductVariantDTO addStock(Long id, Integer quantity) {
        if (quantity <= 0) {
            throw new RuntimeException("Quantity must be positive");
        }
        
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));
        
        variant.setStock(variant.getStock() + quantity);
        stockMovementService.registerMovement(variant, quantity, MovementType.INPUT, "MANUAL_ADD");
        ProductVariant savedVariant = productVariantRepository.save(variant);
        productVariantRepository.flush();
        return convertToDTO(savedVariant);
    }
    
    @Override
    @Transactional
    public ProductVariantDTO subtractStock(Long id, Integer quantity) {
        if (quantity <= 0) {
            throw new RuntimeException("Quantity must be positive");
        }
        
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));
        
        if (variant.getStock() < quantity) {
            throw new RuntimeException("Insufficient stock");
        }
        
        variant.setStock(variant.getStock() - quantity);
        stockMovementService.registerMovement(variant, quantity, MovementType.OUTPUT, "MANUAL_SUBTRACT");
        ProductVariant savedVariant = productVariantRepository.save(variant);
        productVariantRepository.flush();
        return convertToDTO(savedVariant);
    }
    
    private ProductVariantDTO convertToDTO(ProductVariant variant) {
        List<com.yisus.store_backend.product.model.ProductImage> variantImages = 
                productImageRepository.findByProductVariantIdOrderByIsMainDesc(variant.getId());

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
                .images(variantImages.stream()
                        .map(img -> com.yisus.store_backend.product.dto.ProductImageDTO.builder()
                                .id(img.getId())
                                .productId(variant.getProduct().getId())
                                .url(img.getUrl())
                                .isMain(img.getIsMain())
                                .createdAt(img.getCreatedAt())
                                .build())
                        .collect(java.util.stream.Collectors.toList()))
                .createdAt(variant.getCreatedAt())
                .updatedAt(variant.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public ProductVariantDTO uploadImages(Long variantId, MultipartFile[] files) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));

        if(files == null || files.length == 0) return convertToDTO(variant);

        try {
            Path uploadDir = Paths.get("uploads", "products").toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            for(int i = 0; i < files.length; i++) {
                MultipartFile file = files[i];
                if(file == null || file.isEmpty()) continue;

                if(!isImageFile(file)) {
                    throw new RuntimeException("Only image files are allowed");
                }

                String fileName = sanitizeFilename(file);
                Path filePath = uploadDir.resolve(fileName).normalize();

                if(!filePath.startsWith(uploadDir)) {
                    throw new RuntimeException("Invalid file path");
                }

                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                boolean hasPriorImages = !productImageRepository.findByProductVariantIdOrderByIsMainDesc(variantId).isEmpty();
                boolean isFirstImage = !hasPriorImages && i == 0;

                ProductImage productImage = ProductImage.builder()
                        .productVariant(variant)
                        .url("/uploads/products/" + fileName)
                        .isMain(isFirstImage)
                        .build();

                productImageRepository.save(productImage);
            }
            productImageRepository.flush();

            ProductVariant refreshedVariant = productVariantRepository.findById(variantId).get();
            return convertToDTO(refreshedVariant);

        } catch (Exception e) {
            throw new RuntimeException("Failed to upload images: " + e.getMessage(), e);
        }
    }

    private boolean isImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && contentType.startsWith("image/");
    }

    private String sanitizeFilename(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new RuntimeException("Filename cannot be empty");
        }

        String justFilename = originalFilename
                .replaceAll(".*[/\\\\]", "")
                .replaceAll("[^a-zA-Z0-9._-]", "_");

        if (justFilename.isEmpty() || justFilename.contains("..")) {
            throw new RuntimeException("Invalid filename");
        }

        int lastDot = justFilename.lastIndexOf('.');
        String extension = lastDot >= 0 ? justFilename.substring(lastDot + 1).toLowerCase() : "";

        List<String> allowedExtensions = List.of("jpg", "jpeg", "png", "webp");
        if (!allowedExtensions.contains(extension)) {
            throw new RuntimeException("File type not allowed: " + extension);
        }

        String timestamp = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uuid = java.util.UUID.randomUUID().toString().substring(0, 8);

        return String.format("%s_%s.%s", timestamp, uuid, extension);
    }

    @Override
    @Transactional
    public void deleteProductImage(Long imageId) {
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found"));
        
        // Physical deletion
        try {
            String url = image.getUrl();
            if (url != null && url.startsWith("/uploads/")) {
                Path filePath = Paths.get(url.substring(1));
                Files.deleteIfExists(filePath);
            }
        } catch (Exception e) {
            log.error("Failed to delete physical file for image: {}", imageId, e);
        }
        
        ProductVariant variant = image.getProductVariant();
        boolean wasMain = image.getIsMain();
        
        productImageRepository.delete(image);
        productImageRepository.flush();
        
        if (wasMain) {
            List<ProductImage> remainingImages = productImageRepository
                    .findByProductVariantIdOrderByIsMainDesc(variant.getId());
            if (!remainingImages.isEmpty()) {
                ProductImage nextMain = remainingImages.getFirst();
                nextMain.setIsMain(true);
                productImageRepository.save(nextMain);
            }
        }
    }

    @Override
    @Transactional
    public ProductVariantDTO setMainProductImage(Long imageId) {
        ProductImage chosen = productImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found"));
        Long variantId = chosen.getProductVariant().getId();
        List<ProductImage> all = productImageRepository.findByProductVariantIdOrderByIsMainDesc(variantId);
        for (ProductImage img : all) {
            boolean shouldBeMain = img.getId().equals(imageId);
            if (Boolean.TRUE.equals(img.getIsMain()) != shouldBeMain) {
                img.setIsMain(shouldBeMain);
            }
        }
        productImageRepository.saveAll(all);
        productImageRepository.flush();
        ProductVariant refreshed = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));
        return convertToDTO(refreshed);
    }
}
