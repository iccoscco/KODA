package com.yisus.store_backend.product.controller;

import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.product.dto.ProductVariantCreateDTO;
import com.yisus.store_backend.product.dto.ProductVariantDTO;
import com.yisus.store_backend.product.dto.ProductVariantUpdateDTO;
import com.yisus.store_backend.product.service.ProductVariantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/product-variants")
@RequiredArgsConstructor
@Tag(name = "Product Variant", description = "Product variant endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class ProductVariantController {
    
    private final ProductVariantService productVariantService;

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get variants by product", description = "Retrieve all variants for a specific product")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Product variants retrieved successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class)))
    })
    public ResponseEntity<List<ProductVariantDTO>> getVariantsByProductId(
            @Parameter(description = "Product ID") @PathVariable Long productId) {
        List<ProductVariantDTO> variants = productVariantService.getProductVariantsByProductId(productId);
        return ResponseEntity.ok(variants);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get low stock variants", description = "Retrieve variants with low stock")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Low stock variants retrieved successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class)))
    })
    public ResponseEntity<List<ProductVariantDTO>> getLowStockVariants(
            @Parameter(description = "Minimum stock threshold") @RequestParam(defaultValue = "5") Integer minStock) {
        List<ProductVariantDTO> variants = productVariantService.getLowStockVariants(minStock);
        return ResponseEntity.ok(variants);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get variant by ID", description = "Retrieve a specific product variant by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Product variant retrieved successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
        @ApiResponse(responseCode = "404", description = "Product variant not found")
    })
    public ResponseEntity<ProductVariantDTO> getProductVariantById(@PathVariable Long id) {
        ProductVariantDTO variant = productVariantService.getProductVariantById(id);
        return ResponseEntity.ok(variant);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('products.create')")
    @Operation(summary = "Create product variant", description = "Create a new product variant")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Product variant created successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Product variant already exists")
    })
    public ResponseEntity<ProductVariantDTO> createProductVariant(@Valid @RequestBody ProductVariantCreateDTO request) {
        ProductVariantDTO variant = productVariantService.createProductVariant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(variant);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Update product variant", description = "Update an existing product variant")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Product variant updated successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "404", description = "Product variant not found"),
        @ApiResponse(responseCode = "409", description = "SKU already exists")
    })
    public ResponseEntity<ProductVariantDTO> updateProductVariant(@PathVariable Long id, @RequestBody ProductVariantUpdateDTO request) {
        ProductVariantDTO variant = productVariantService.updateProductVariant(id, request);
        return ResponseEntity.ok(variant);
    }

    @PutMapping("/{id}/stock")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Update variant stock", description = "Update the stock of a product variant")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Stock updated successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid stock value"),
        @ApiResponse(responseCode = "404", description = "Product variant not found")
    })
    public ResponseEntity<ProductVariantDTO> updateStock(
            @PathVariable Long id, 
            @Parameter(description = "New stock value") @RequestParam Integer stock) {
        ProductVariantDTO variant = productVariantService.updateStock(id, stock);
        return ResponseEntity.ok(variant);
    }

    @PutMapping("/{id}/stock/add")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Add stock to variant", description = "Add quantity to variant stock")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Stock added successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid quantity"),
        @ApiResponse(responseCode = "404", description = "Product variant not found")
    })
    public ResponseEntity<ProductVariantDTO> addStock(
            @PathVariable Long id, 
            @Parameter(description = "Quantity to add") @RequestParam Integer quantity) {
        ProductVariantDTO variant = productVariantService.addStock(id, quantity);
        return ResponseEntity.ok(variant);
    }

    @PutMapping("/{id}/stock/subtract")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Subtract stock from variant", description = "Subtract quantity from variant stock")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Stock subtracted successfully", 
            content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid quantity or insufficient stock"),
        @ApiResponse(responseCode = "404", description = "Product variant not found")
    })
    public ResponseEntity<ProductVariantDTO> subtractStock(
            @PathVariable Long id, 
            @Parameter(description = "Quantity to subtract") @RequestParam Integer quantity) {
        ProductVariantDTO variant = productVariantService.subtractStock(id, quantity);
        return ResponseEntity.ok(variant);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('products.delete')")
    @Operation(summary = "Delete product variant", description = "Delete a product variant")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Product variant deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Product variant not found")
    })
    public ResponseEntity<MessageResponse> deleteProductVariant(@PathVariable Long id) {
        productVariantService.deleteProductVariant(id);
        return ResponseEntity.ok(new MessageResponse("Product variant deleted successfully"));
    }

    @PostMapping(value = "/{id}/images", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Upload variant images",
               description = "Upload images for an existing product variant. If the variant had no images yet, the first file in this request becomes the main image; otherwise new files are not set as main (use PATCH .../images/{id}/main).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Images uploaded successfully",
                    content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
            @ApiResponse(responseCode = "404", description = "Product variant not found")
    })
    public ResponseEntity<ProductVariantDTO> uploadVariantImages(
            @PathVariable Long id,
            @Parameter(description = "Product images (optional, max 50MB total)")
            @RequestParam("files") MultipartFile[] files) {
        ProductVariantDTO variant = productVariantService.uploadImages(id, files);
        return ResponseEntity.ok(variant);
    }

    @DeleteMapping("/images/{imageId}")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Delete variant image", description = "Physically deletes a variant image by its unique ID. The main image will automatically fall back to the next image if the main is deleted.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Variant image deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Image not found")
    })
    public ResponseEntity<MessageResponse> deleteVariantImage(@PathVariable Long imageId) {
        productVariantService.deleteProductImage(imageId);
        return ResponseEntity.ok(new MessageResponse("Variant image deleted successfully"));
    }

    @PatchMapping("/images/{imageId}/main")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Set main variant image", description = "Marks this image as the main image for its variant. Other images of the same variant are unset as main.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Main image updated",
                    content = @Content(schema = @Schema(implementation = ProductVariantDTO.class))),
            @ApiResponse(responseCode = "404", description = "Image not found")
    })
    public ResponseEntity<ProductVariantDTO> setMainVariantImage(@PathVariable Long imageId) {
        ProductVariantDTO variant = productVariantService.setMainProductImage(imageId);
        return ResponseEntity.ok(variant);
    }
}
