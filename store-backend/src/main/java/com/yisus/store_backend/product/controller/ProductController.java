package com.yisus.store_backend.product.controller;

import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;
import com.yisus.store_backend.product.dto.ProductCreateDTO;
import com.yisus.store_backend.product.dto.ProductDTO;
import com.yisus.store_backend.product.dto.ProductPaginatedResponse;
import com.yisus.store_backend.product.dto.ProductUpdateDTO;
import com.yisus.store_backend.product.dto.ProductUpdateStatusDTO;
import com.yisus.store_backend.product.dto.StockMovementDTO;
import com.yisus.store_backend.product.service.ProductService;
import com.yisus.store_backend.product.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.web.bind.WebDataBinder;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@Tag(name = "Product", description = "Product endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class ProductController {
    private final ProductService productService;
    private final StockMovementService stockMovementService;

    // Spring Framework 7 requiere allowlist explícita para @ModelAttribute en form-data
    @InitBinder("productCreateDTO")
    public void allowProductFields(WebDataBinder binder) {
        binder.setAllowedFields(
                "name", "purchasePrice", "salePrice",
                "discountPercentage", "discountStart", "discountEnd",
                "isFeatured", "categoryId", "minStock"
        );
    }

    @GetMapping
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get all products", description = "Retrieve all products with optional search and pagination")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Products retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ProductDTO.class))),
            @ApiResponse(responseCode = "200", description = "Products retrieved successfully (paginated)",
                    content = @Content(schema = @Schema(implementation = ProductPaginatedResponse.class)))
    })
    public ResponseEntity<?> getAllProducts(@RequestParam(required = false) String search,
                                            @RequestParam(required = false) Integer limit,
                                            @RequestParam(required = false) Integer offset,
                                            HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").ascending());
            Page<ProductDTO> productPage = productService.getAllProductsPaginated(search, pageable);
            PaginatedResponse<ProductDTO> response = PaginationValidator.buildPaginatedResponse(
                    productPage,
                    limit,
                    offset,
                    request.getRequestURI(),
                    request.getQueryString()
            );
            return ResponseEntity.ok(response);
        }
        else {
            List<ProductDTO> products = productService.getAllProducts(search);
            return ResponseEntity.ok(products);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('products.read')")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        ProductDTO product = productService.getProductById(id);
        return ResponseEntity.ok(product);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('products.create')")
    @Operation(summary = "Create product",
               description = "Create a new product. Send JSON body. To add images, call POST /api/products/{id}/images after creation.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Product created successfully",
                    content = @Content(schema = @Schema(implementation = ProductDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<ProductDTO> createProduct(
            @Valid @RequestBody ProductCreateDTO request) {
        ProductDTO product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('products.update')")
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, @RequestBody ProductUpdateDTO request) {
        ProductDTO product = productService.updateProduct(id, request);
        return ResponseEntity.ok(product);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('products.delete')")
    @Operation(summary = "Delete product", description = "Soft-deletes a product by setting isActive to false")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Product deleted successfully",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "404", description = "Product not found", content = @Content)
    })
    public ResponseEntity<MessageResponse> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(new MessageResponse("Product deleted successfully"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('products.update')")
    public ResponseEntity<MessageResponse> updateProductStatus(@PathVariable Long id, @Valid @RequestBody ProductUpdateStatusDTO request) {
        productService.updateProductStatus(id, request.getIsActive());
        return ResponseEntity.ok(new MessageResponse("Product status updated successfully"));
    }

    @GetMapping("/{id}/stock-movements")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get stock movements by product ID", description = "Retrieve stock inputs and outputs history for a specific product")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Stock movements retrieved successfully",
                    content = @Content(schema = @Schema(implementation = StockMovementDTO.class))),
            @ApiResponse(responseCode = "404", description = "Product not found", content = @Content)
    })
    public ResponseEntity<List<StockMovementDTO>> getStockMovementsByProductId(@PathVariable Long id) {
        productService.getProductById(id); // throws exception if not found
        List<StockMovementDTO> movements = stockMovementService.getMovementsByProductId(id);
        return ResponseEntity.ok(movements);
    }
}
