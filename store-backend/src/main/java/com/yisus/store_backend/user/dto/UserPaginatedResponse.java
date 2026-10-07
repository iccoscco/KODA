package com.yisus.store_backend.user.dto;

import com.yisus.store_backend.common.dto.PaginatedResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Paginated array response of users")
public class UserPaginatedResponse extends PaginatedResponse<UserDTO> {
}
