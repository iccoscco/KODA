package com.yisus.store_backend.order.service;

import com.yisus.store_backend.cash.model.CashRegister;
import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.cash.repository.CashRegisterRepository;
import com.yisus.store_backend.cash.service.CashService;
import com.yisus.store_backend.notification.service.NotificationService;
import com.yisus.store_backend.order.dto.OrderCreateDTO;
import com.yisus.store_backend.order.dto.OrderDTO;
import com.yisus.store_backend.order.dto.OrderItemCreateDTO;
import com.yisus.store_backend.order.dto.PaymentCreateDTO;
import com.yisus.store_backend.order.dto.ShippingAddressCreateDTO;
import com.yisus.store_backend.order.model.Order;
import com.yisus.store_backend.order.model.Payment;
import com.yisus.store_backend.order.repository.OrderRepository;
import com.yisus.store_backend.order.repository.PaymentRepository;
import com.yisus.store_backend.order.repository.ShippingAddressRepository;
import com.yisus.store_backend.order.service.Impl.OrderServiceImpl;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.service.StockMovementService;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceStockAlertTest {
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private ShippingAddressRepository shippingAddressRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductImageRepository productImageRepository;
    @Mock private CashService cashService;
    @Mock private CashRegisterRepository cashRegisterRepository;
    @Mock private CashOpeningRepository cashOpeningRepository;
    @Mock private NotificationService notificationService;
    @Mock private StockMovementService stockMovementService;
    @InjectMocks private OrderServiceImpl orderService;

    @Test
    void saleAtMinimumReturnsTheAlertToTheCashier() {
        OrderDTO response = sell(10, 5, 5);

        assertEquals(1, response.getStockAlerts().size());
        var alert = response.getStockAlerts().get(0);
        assertEquals(42L, alert.getVariantId());
        assertEquals("Perno", alert.getProductName());
        assertEquals(5, alert.getStock());
        assertEquals(5, alert.getMinStock());
    }

    @Test
    void saleAboveMinimumReturnsNoAlerts() {
        OrderDTO response = sell(10, 5, 4);
        assertTrue(response.getStockAlerts().isEmpty());
    }

    private OrderDTO sell(int initialStock, int minimum, int quantity) {
        User user = User.builder().id(1L).name("Cajero").build();
        Product product = Product.builder()
                .name("Perno").salePrice(BigDecimal.TEN)
                .purchasePrice(BigDecimal.ONE).totalSold(0L).build();
        ProductVariant variant = ProductVariant.builder()
                .id(42L).product(product).stock(initialStock)
                .minStock(minimum).sku("PER-01").build();
        CashRegister cashRegister = CashRegister.builder().id(3L).build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(cashRegisterRepository.findById(3L)).thenReturn(Optional.of(cashRegister));
        when(cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(3L))
                .thenReturn(Optional.of(org.mockito.Mockito.mock(com.yisus.store_backend.cash.model.CashOpening.class)));
        when(productVariantRepository.findById(42L)).thenReturn(Optional.of(variant));
        when(productImageRepository.findByProductVariantIdOrderByIsMainDesc(42L))
                .thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId(9L);
            return saved;
        });
        when(paymentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(shippingAddressRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        OrderCreateDTO request = OrderCreateDTO.builder()
                .userId(1L).cashRegisterId(3L)
                .orderItems(List.of(OrderItemCreateDTO.builder()
                        .productVariantId(42L).quantity(quantity).build()))
                .shippingAddress(ShippingAddressCreateDTO.builder().fullName("Cliente").build())
                .payments(List.of(PaymentCreateDTO.builder()
                        .method(Payment.PaymentMethod.CASH)
                        .amount(BigDecimal.TEN.multiply(BigDecimal.valueOf(quantity)))
                        .build()))
                .build();
        return orderService.createOrder(request);
    }
}
