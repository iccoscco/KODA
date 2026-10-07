package com.yisus.store_backend.cash.controller;

import com.yisus.store_backend.cash.dto.CashRegisterCreateDTO;
import com.yisus.store_backend.cash.dto.CashRegisterDTO;
import com.yisus.store_backend.cash.model.CashRegister;
import com.yisus.store_backend.cash.repository.CashRegisterRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/cash/registers")
@RequiredArgsConstructor
@Tag(name = "Cash registers", description = "Cajas físicas (varias sesiones simultáneas)")
@SecurityRequirement(name = "Bearer Authentication")
public class CashRegisterController {

    private final CashRegisterRepository cashRegisterRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('cash.read')")
    @Operation(summary = "Listar cajas")
    public ResponseEntity<List<CashRegisterDTO>> list() {
        List<CashRegisterDTO> list = cashRegisterRepository.findAllByOrderByIdAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('cash.create_register')")
    @Operation(summary = "Crear caja", description = "Nueva caja con saldo 0; cada cajera abre su sesión sobre una caja.")
    public ResponseEntity<CashRegisterDTO> create(@Valid @RequestBody CashRegisterCreateDTO body) {
        CashRegister saved = cashRegisterRepository.save(CashRegister.builder()
                .name(body.getName().trim())
                .balance(BigDecimal.ZERO)
                .build());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    private CashRegisterDTO toDto(CashRegister cr) {
        return CashRegisterDTO.builder()
                .id(cr.getId())
                .name(cr.getName() != null && !cr.getName().isBlank() ? cr.getName() : ("Caja " + cr.getId()))
                .balance(cr.getBalance())
                .updatedAt(cr.getUpdatedAt())
                .build();
    }
}
