package com.yisus.store_backend.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddressCreateDTO {
    private String fullName;

    private String address;

    private String city;

    private String phone;
}
