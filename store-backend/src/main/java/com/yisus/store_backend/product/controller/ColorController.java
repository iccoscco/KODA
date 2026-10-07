package com.yisus.store_backend.product.controller;

import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.product.dto.ColorCreateDTO;
import com.yisus.store_backend.product.dto.ColorDTO;
import com.yisus.store_backend.product.dto.ColorUpdateDTO;
import com.yisus.store_backend.product.service.ColorService;
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
@RequestMapping("/colors")
@RequiredArgsConstructor
@Tag(name = "Color", description = "Color endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class ColorController {
    
    private final ColorService colorService;

    @GetMapping
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get all colors", description = "Retrieve all colors")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Colors retrieved successfully", 
            content = @Content(schema = @Schema(implementation = ColorDTO.class)))
    })
    public ResponseEntity<List<ColorDTO>> getAllColors() {
        List<ColorDTO> colors = colorService.getAllColors();
        return ResponseEntity.ok(colors);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('products.read')")
    @Operation(summary = "Get color by ID", description = "Retrieve a specific color by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Color retrieved successfully", 
            content = @Content(schema = @Schema(implementation = ColorDTO.class))),
        @ApiResponse(responseCode = "404", description = "Color not found")
    })
    public ResponseEntity<ColorDTO> getColorById(@PathVariable Long id) {
        ColorDTO color = colorService.getColorById(id);
        return ResponseEntity.ok(color);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('products.create')")
    @Operation(summary = "Create color", description = "Create a new color")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Color created successfully", 
            content = @Content(schema = @Schema(implementation = ColorDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Color already exists")
    })
    public ResponseEntity<ColorDTO> createColor(@Valid @RequestBody ColorCreateDTO request) {
        ColorDTO color = colorService.createColor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(color);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('products.update')")
    @Operation(summary = "Update color", description = "Update an existing color")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Color updated successfully", 
            content = @Content(schema = @Schema(implementation = ColorDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "404", description = "Color not found"),
        @ApiResponse(responseCode = "409", description = "Color already exists")
    })
    public ResponseEntity<ColorDTO> updateColor(@PathVariable Long id, @RequestBody ColorUpdateDTO request) {
        ColorDTO color = colorService.updateColor(id, request);
        return ResponseEntity.ok(color);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('products.delete')")
    @Operation(summary = "Delete color", description = "Delete a color")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Color deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Color not found")
    })
    public ResponseEntity<MessageResponse> deleteColor(@PathVariable Long id) {
        colorService.deleteColor(id);
        return ResponseEntity.ok(new MessageResponse("Color deleted successfully"));
    }
}
