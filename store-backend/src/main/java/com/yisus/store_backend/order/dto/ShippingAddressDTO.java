package com.yisus.store_backend.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddressDTO {
    private Long id;
    private Long orderId;
    private String fullName;
    private String address;
    private String city;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
