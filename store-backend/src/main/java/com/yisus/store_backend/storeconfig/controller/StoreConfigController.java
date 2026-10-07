package com.yisus.store_backend.storeconfig.controller;

import com.yisus.store_backend.storeconfig.dto.StoreConfigBrandingDTO;
import com.yisus.store_backend.storeconfig.dto.StoreConfigDTO;
import com.yisus.store_backend.storeconfig.dto.StoreConfigUpdateDTO;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/store-config")
@RequiredArgsConstructor
@Tag(name = "Store Config", description = "Configuración general de la tienda")
@SecurityRequirement(name = "Bearer Authentication")
public class StoreConfigController {

    private final StoreConfigService storeConfigService;

    @GetMapping
    @PreAuthorize("hasAuthority('settings.read')")
    @Operation(summary = "Obtener configuración de la tienda")
    public ResponseEntity<StoreConfigDTO> getConfig() {
        return ResponseEntity.ok(storeConfigService.getConfig());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('settings.update')")
    @Operation(summary = "Actualizar configuración de la tienda")
    public ResponseEntity<StoreConfigDTO> updateConfig(@Valid @RequestBody StoreConfigUpdateDTO dto) {
        return ResponseEntity.ok(storeConfigService.updateConfig(dto));
    }

    @GetMapping("/branding")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtener nombre y logo de la tienda (acceso general autenticado)")
    public ResponseEntity<StoreConfigBrandingDTO> getBranding() {
        return ResponseEntity.ok(storeConfigService.getBranding());
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('settings.update')")
    @Operation(summary = "Subir o reemplazar el logo de la tienda")
    public ResponseEntity<StoreConfigDTO> uploadLogo(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(storeConfigService.uploadLogo(file));
    }

    @DeleteMapping("/logo")
    @PreAuthorize("hasAuthority('settings.update')")
    @Operation(summary = "Eliminar el logo de la tienda")
    public ResponseEntity<StoreConfigDTO> deleteLogo() {
        return ResponseEntity.ok(storeConfigService.deleteLogo());
    }

    @PostMapping("/printer/test")
    @PreAuthorize("hasAuthority('settings.update')")
    @Operation(summary = "Probar la conexión con la ticketera TCP/IP")
    public ResponseEntity<com.yisus.store_backend.common.dto.MessageResponse> testPrinterConnection(
            @Valid @RequestBody com.yisus.store_backend.storeconfig.dto.PrinterTestDTO testDTO) {
        storeConfigService.testPrinterConnection(testDTO.getPrinterIp(), testDTO.getPrinterPort());
        return ResponseEntity.ok(new com.yisus.store_backend.common.dto.MessageResponse("Conexión con la impresora exitosa"));
    }
}
