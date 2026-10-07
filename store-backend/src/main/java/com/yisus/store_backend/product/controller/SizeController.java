package com.yisus.store_backend.product.controller;

import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.product.dto.SizeCreateDTO;
import com.yisus.store_backend.product.dto.SizeDTO;
import com.yisus.store_backend.product.dto.SizeUpdateDTO;
import com.yisus.store_backend.product.service.SizeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
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

import java.util.List;

@RestController
@RequestMapping("/sizes")
@RequiredArgsConstructor
@Tag(name = "Size", description = "Size endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class SizeController {
    
    private final SizeService sizeService;

    @GetMapping
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get all sizes", description = "Retrieve all sizes")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Sizes retrieved successfully", 
            content = @Content(schema = @Schema(implementation = SizeDTO.class)))
    })
    public ResponseEntity<List<SizeDTO>> getAllSizes() {
        List<SizeDTO> sizes = sizeService.getAllSizes();
        return ResponseEntity.ok(sizes);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get size by ID", description = "Retrieve a specific size by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Size retrieved successfully", 
            content = @Content(schema = @Schema(implementation = SizeDTO.class))),
        @ApiResponse(responseCode = "404", description = "Size not found")
    })
    public ResponseEntity<SizeDTO> getSizeById(@PathVariable Long id) {
        SizeDTO size = sizeService.getSizeById(id);
        return ResponseEntity.ok(size);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('products.create')")
    @Operation(summary = "Create size", description = "Create a new size")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Size created successfully", 
            content = @Content(schema = @Schema(implementation = SizeDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Size already exists")
    })
    public ResponseEntity<SizeDTO> createSize(@Valid @RequestBody SizeCreateDTO request) {
        SizeDTO size = sizeService.createSize(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(size);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Update size", description = "Update an existing size")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Size updated successfully", 
            content = @Content(schema = @Schema(implementation = SizeDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "404", description = "Size not found"),
        @ApiResponse(responseCode = "409", description = "Size already exists")
    })
    public ResponseEntity<SizeDTO> updateSize(@PathVariable Long id, @RequestBody SizeUpdateDTO request) {
        SizeDTO size = sizeService.updateSize(id, request);
        return ResponseEntity.ok(size);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('products.delete')")
    @Operation(summary = "Delete size", description = "Delete a size")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Size deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Size not found")
    })
    public ResponseEntity<MessageResponse> deleteSize(@PathVariable Long id) {
        sizeService.deleteSize(id);
        return ResponseEntity.ok(new MessageResponse("Size deleted successfully"));
    }
}
