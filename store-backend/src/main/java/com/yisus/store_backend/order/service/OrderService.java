package com.yisus.store_backend.order.service;

import com.yisus.store_backend.order.dto.OrderCreateDTO;
import com.yisus.store_backend.order.dto.OrderDTO;
import com.yisus.store_backend.order.dto.OrderStatusUpdateDTO;
import com.yisus.store_backend.order.model.Order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {
    OrderDTO createOrder(OrderCreateDTO orderCreateDTO);
    OrderDTO updateOrderStatus(Long id, Order.OrderStatus status);
    OrderDTO updateOrderStatus(Long id, OrderStatusUpdateDTO statusUpdateDTO);
    void cancelOrder(Long id);
    OrderDTO getOrderById(Long id);
    List<OrderDTO> getOrdersByUser(Long userId);
    List<OrderDTO> getOrdersByStatus(Order.OrderStatus status);
    List<OrderDTO> getAllOrders(String search);
    Page<OrderDTO> getAllOrdersPaginated(String search, Pageable pageable);
    List<OrderDTO> getOrdersByCashSession(Long sessionId);
}
