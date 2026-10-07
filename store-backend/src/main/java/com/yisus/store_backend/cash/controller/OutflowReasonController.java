package com.yisus.store_backend.cash.controller;

import com.yisus.store_backend.cash.dto.OutflowReasonCreateDTO;
import com.yisus.store_backend.cash.dto.OutflowReasonDTO;
import com.yisus.store_backend.cash.service.CashService;
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
@RequestMapping("/cash/outflow-reasons")
@RequiredArgsConstructor
@Tag(name = "Outflow Reasons", description = "Cash outflow reason management endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class OutflowReasonController {
    
    private final CashService cashService;

    @PostMapping
    @PreAuthorize("hasAuthority('cash.create')")
    @Operation(summary = "Create outflow reason", description = "Create a new cash outflow reason")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Outflow reason created successfully", 
            content = @Content(schema = @Schema(implementation = OutflowReasonDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Outflow reason already exists")
    })
    public ResponseEntity<OutflowReasonDTO> createOutflowReason(@Valid @RequestBody OutflowReasonCreateDTO request) {
        OutflowReasonDTO reason = cashService.createOutflowReason(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(reason);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Get all outflow reasons", description = "Retrieve all cash outflow reasons")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Outflow reasons retrieved successfully", 
            content = @Content(schema = @Schema(implementation = OutflowReasonDTO.class)))
    })
    public ResponseEntity<List<OutflowReasonDTO>> getAllOutflowReasons() {
        List<OutflowReasonDTO> reasons = cashService.getAllOutflowReasons();
        return ResponseEntity.ok(reasons);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('cash.delete')")
    @Operation(summary = "Delete outflow reason", description = "Delete a cash outflow reason")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Outflow reason deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Outflow reason not found")
    })
    public ResponseEntity<Void> deleteOutflowReason(@PathVariable Long id) {
        cashService.deleteOutflowReason(id);
        return ResponseEntity.ok().build();
    }
}
