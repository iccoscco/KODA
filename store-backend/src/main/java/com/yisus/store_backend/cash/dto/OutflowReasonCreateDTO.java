package com.yisus.store_backend.cash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutflowReasonCreateDTO {
    @NotBlank(message = "Reason name is required")
    private String name;
    
    private String description;
}
