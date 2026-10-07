package com.yisus.store_backend.category.dto;

import com.yisus.store_backend.common.dto.PaginatedResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Respuesta paginada de categorías")
public class CategoryPaginatedResponse extends PaginatedResponse<CategoryDTO> {
}
