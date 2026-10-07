package com.yisus.store_backend.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Schema(description = "Message response")
public class MessageResponse {
    @Schema(example = "Operation completed successfully")
    private String message;
}
