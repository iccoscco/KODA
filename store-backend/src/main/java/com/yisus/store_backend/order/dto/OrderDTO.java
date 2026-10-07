package com.yisus.store_backend.order.dto;

import com.yisus.store_backend.order.model.Order;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {
    private Long id;
    private Long userId;
    private String userName;
    private Order.OrderStatus status;
    private BigDecimal total;
    private List<OrderItemDTO> orderItems;
    private List<PaymentDTO> payments;
    private ShippingAddressDTO shippingAddress;
    /** Caja donde se registró el ingreso (punto de venta). */
    private Long cashRegisterId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
