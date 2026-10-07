package com.yisus.store_backend.product.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColorUpdateDTO {
    private String name;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Hex code must be in format #RRGGBB")
    private String hexCode;
}
