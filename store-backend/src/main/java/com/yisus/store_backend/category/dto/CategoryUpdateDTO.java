package com.yisus.store_backend.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryUpdateDTO {
    @NotBlank
    @Size(min = 3, max = 50)
    private String name;

    @Size(max = 255)
    private String description;
}
