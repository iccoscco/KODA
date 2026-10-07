package com.yisus.store_backend.product.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Product Image response")
public class ProductImageDTO {
    
    @Schema(description = "Image ID", example = "1")
    private Long id;
    
    @Schema(description = "Product ID", example = "1")
    private Long productId;
    
    @Schema(description = "Image URL", example = "/uploads/products/image-123456.jpg")
    private String url;
    
    @Schema(description = "Whether this is main product image", example = "false")
    private Boolean isMain;
    
    @Schema(description = "Creation date", example = "2024-01-15T10:30:00")
    private LocalDateTime createdAt;
}
