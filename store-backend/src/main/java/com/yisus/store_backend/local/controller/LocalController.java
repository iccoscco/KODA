package com.yisus.store_backend.local.controller;

import com.yisus.store_backend.local.dto.LocalDTO;
import com.yisus.store_backend.local.model.Local;
import com.yisus.store_backend.local.repository.LocalRepository;
import com.yisus.store_backend.local.service.LocalScope;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/locals")
@RequiredArgsConstructor
@Tag(name = "Locals", description = "Contexto de local de la solicitud")
@SecurityRequirement(name = "******")
public class LocalController {
    private final LocalScope localScope;
    private final LocalRepository localRepository;

    @GetMapping("/current")
    @Operation(summary = "Obtener el local efectivo de la solicitud")
    public ResponseEntity<LocalDTO> current() {
        Local local = localScope.local();
        return ResponseEntity.ok(LocalDTO.from(local, localScope.canSwitch()));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Listar locales activos para el selector de superadministrador")
    public ResponseEntity<List<LocalDTO>> listActive() {
        List<LocalDTO> locals = localRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(local -> LocalDTO.from(local, true))
                .toList();
        return ResponseEntity.ok(locals);
    }
}
