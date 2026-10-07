package com.yisus.store_backend.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Respuesta paginada genérica")
public class PaginatedResponse<T> {

    @Schema(description = "Número total de elementos", example = "131")
    private Long count;

    @Schema(description = "URL de la siguiente página", example = "http://localhost:8080/api/roles?limit=10&offset=10")
    private String next;

    @Schema(description = "URL de la página anterior", example = "http://localhost:8080/api/roles?limit=10&offset=0")
    private String previous;

    @Schema(description = "Lista de resultados de la página actual")
    private List<T> results;
}
