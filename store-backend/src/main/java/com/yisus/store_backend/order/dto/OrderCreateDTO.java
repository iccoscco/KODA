package com.yisus.store_backend.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreateDTO {
    @NotNull(message = "User ID is required")
    private Long userId;
    
    @Valid
    @NotEmpty(message = "Order items cannot be empty")
    private List<OrderItemCreateDTO> orderItems;
    
    @Valid
    @NotNull(message = "Shipping address is required")
    private ShippingAddressCreateDTO shippingAddress;
    
    @Valid
    @NotEmpty(message = "At least one payment is required")
    private List<PaymentCreateDTO> payments;

    /**
     * Caja donde se registra el ingreso. Obligatorio si hay más de una sesión abierta;
     * si solo hay una, el backend puede inferirla.
     */
    private Long cashRegisterId;
}
