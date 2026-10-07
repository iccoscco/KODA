package com.yisus.store_backend.order.dto;

import com.yisus.store_backend.order.model.Order;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusUpdateDTO {
    @NotNull(message = "Status is required")
    private Order.OrderStatus status;
}
