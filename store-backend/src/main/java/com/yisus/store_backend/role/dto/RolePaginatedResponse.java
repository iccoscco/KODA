package com.yisus.store_backend.role.dto;

import com.yisus.store_backend.common.dto.PaginatedResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Paginated response of roles")
public class RolePaginatedResponse extends PaginatedResponse<RoleDTO> {
}
