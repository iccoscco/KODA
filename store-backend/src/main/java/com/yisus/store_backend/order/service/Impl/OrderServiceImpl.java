package com.yisus.store_backend.order.service.Impl;

import com.yisus.store_backend.cash.model.CashOpening;
import com.yisus.store_backend.cash.model.CashRegister;
import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.cash.repository.CashRegisterRepository;
import com.yisus.store_backend.cash.service.CashService;
import com.yisus.store_backend.order.dto.*;
import com.yisus.store_backend.order.model.*;
import com.yisus.store_backend.order.repository.*;
import com.yisus.store_backend.order.service.OrderService;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductImage;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.notification.model.NotificationType;
import com.yisus.store_backend.notification.service.NotificationService;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import com.yisus.store_backend.product.service.StockMovementService;
import com.yisus.store_backend.product.model.StockMovement.MovementType;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {
    
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ShippingAddressRepository shippingAddressRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    @Lazy
    private final CashService cashService;
    private final CashRegisterRepository cashRegisterRepository;
    private final CashOpeningRepository cashOpeningRepository;
    private final NotificationService notificationService;
    private final StockMovementService stockMovementService;
    
    @Override
    @Transactional
    public OrderDTO createOrder(OrderCreateDTO dto) {
        // Validar usuario
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        CashRegister cashRegister = resolveCashRegisterForNewOrder(dto.getCashRegisterId());

        // Crear orden - Punto de Venta: automáticamente marcada como PAGADA
        Order order = Order.builder()
                .user(user)
                .status(Order.OrderStatus.PAID)
                .total(BigDecimal.ZERO)
                .orderItems(new ArrayList<>())
                .payments(new ArrayList<>())
                .cashRegister(cashRegister)
                .build();
        
        // Calcular total y crear items
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemCreateDTO itemDto : dto.getOrderItems()) {
            ProductVariant variant = productVariantRepository.findById(itemDto.getProductVariantId())
                    .orElseThrow(() -> new RuntimeException("Product variant not found"));
            
            // Validar stock
            if (variant.getStock() < itemDto.getQuantity()) {
                throw new RuntimeException("Insufficient stock for variant: " + variant.getId());
            }
            
            // Calcular precio unitario (usa override de la variante si existe)
            BigDecimal unitPrice;
            Product product = variant.getProduct();

            if (itemDto.getCustomUnitPrice() != null) {
                // Validar permisos para precio personalizado
                validateCustomPricePermissions(itemDto.getCustomUnitPrice(), variant);
                unitPrice = itemDto.getCustomUnitPrice();
            } else {
                // Usar precio efectivo de la variante (descuento del producto si vigente)
                unitPrice = calculateEffectivePrice(variant);
            }
            
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            total = total.add(itemTotal);

            // Bug #5 fix: incrementar total_sold del producto
            product.setTotalSold(product.getTotalSold() + itemDto.getQuantity());
            productRepository.save(product);
            
            BigDecimal purchasePrice = resolveEffectivePurchasePrice(variant);

            // Crear order item
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .productVariant(variant)
                    .quantity(itemDto.getQuantity())
                    .unitPrice(unitPrice)
                    .purchasePrice(purchasePrice)
                    .purchasePriceEstimated(Boolean.FALSE)
                    .build();
            
            order.getOrderItems().add(orderItem);
            
            // Restar stock
            int newStock = variant.getStock() - itemDto.getQuantity();
            variant.setStock(newStock);
            productVariantRepository.save(variant);
            stockMovementService.registerMovement(variant, itemDto.getQuantity(), MovementType.OUTPUT, "SALE");

            // Notificar si el stock quedó en o por debajo del mínimo (solo usuarios con centro de notificaciones)
            int minStock = variant.getMinStock() != null ? variant.getMinStock() : 0;
            if (newStock <= minStock) {
                String variantDesc = buildVariantDescription(variant);
                NotificationType notifType = newStock == 0 ? NotificationType.ALERT : NotificationType.WARNING;
                String title = (newStock == 0 ? "Sin stock: " : "Stock bajo: ") + product.getName();
                String message = variantDesc + " — Stock actual: " + newStock
                        + " (mínimo: " + minStock + ")";
                String link = "/products?search=" + java.net.URLEncoder.encode(product.getName(), java.nio.charset.StandardCharsets.UTF_8);
                notificationService.createForUsersWithPermission("notifications.read", title, message, notifType, link);
            }
        }
        
        order.setTotal(total);
        
        // Guardar orden primero para obtener ID
        Order savedOrder = orderRepository.save(order);
        
        // Crear dirección de envío (nombre opcional con default Público General)
        ShippingAddressCreateDTO addressDto = dto.getShippingAddress();
        String clientName = addressDto.getFullName();
        if (clientName == null || clientName.trim().isEmpty()) {
            clientName = "Público General";
        } else {
            clientName = clientName.trim();
        }
        ShippingAddress shippingAddress = ShippingAddress.builder()
                .order(savedOrder)
                .fullName(clientName)
                .address(blankToEmpty(addressDto.getAddress()))
                .city(blankToEmpty(addressDto.getCity()))
                .phone(blankToEmpty(addressDto.getPhone()))
                .build();
        
        // Crear pagos - Punto de Venta: automáticamente marcados como COMPLETADOS
        BigDecimal totalPayments = BigDecimal.ZERO;
        List<Payment> paymentList = new ArrayList<>();
        for (PaymentCreateDTO paymentDto : dto.getPayments()) {
            Payment payment = Payment.builder()
                    .order(savedOrder)
                    .method(paymentDto.getMethod())
                    .status(Payment.PaymentStatus.COMPLETED)
                    .amount(paymentDto.getAmount())
                    .paidAt(LocalDateTime.now())
                    .build();
            
            paymentList.add(payment);
            totalPayments = totalPayments.add(paymentDto.getAmount());
        }
        
        // Validar que el total de pagos coincida con el total de la orden
        if (totalPayments.compareTo(total) != 0) {
            throw new RuntimeException("Payment total does not match order total");
        }
        
        // Guardar todo explícitamente y asociarlo en memoria para la respuesta JSON
        List<Payment> savedPayments = paymentRepository.saveAll(paymentList);
        ShippingAddress savedAddress = shippingAddressRepository.save(shippingAddress);
        
        savedOrder.setPayments(savedPayments);
        savedOrder.setShippingAddress(savedAddress);
        
        // Punto de Venta: generar automáticamente el ingreso en caja
        cashService.createInflowFromOrder(savedOrder.getId());
        
        // No es necesario otro orderRepository.save() porque los FKs están en los hijos
        // y ninguna columna de la tabla orders cambió
        
        return convertToDTO(savedOrder);
    }
    
    @Override
    @Transactional
    public OrderDTO updateOrderStatus(Long id, Order.OrderStatus status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        // Validar transiciones de estado
        validateStatusTransition(order.getStatus(), status);
        
        Order.OrderStatus previousStatus = order.getStatus();
        
        order.setStatus(status);
        
        // Si el estado es CANCELLED, devolver stock y revertir total_sold
        if (status == Order.OrderStatus.CANCELLED) {
            for (OrderItem item : order.getOrderItems()) {
                ProductVariant variant = item.getProductVariant();
                variant.setStock(variant.getStock() + item.getQuantity());
                productVariantRepository.save(variant);
                stockMovementService.registerMovement(variant, item.getQuantity(), MovementType.INPUT, "CANCELLED_SALE");

                // Revertir total_sold al cancelar
                Product prod = variant.getProduct();
                prod.setTotalSold(Math.max(0L, prod.getTotalSold() - item.getQuantity()));
                productRepository.save(prod);
            }
            
            // Cancelar pagos pendientes
            for (Payment payment : order.getPayments()) {
                if (payment.getStatus() == Payment.PaymentStatus.PENDING) {
                    payment.setStatus(Payment.PaymentStatus.FAILED);
                    paymentRepository.save(payment);
                }
            }
        }
        
        Order savedOrder = orderRepository.save(order);
        orderRepository.flush();
        
        // Si se cancela un pedido que ya había sido pagado, procesar reembolso
        if (status == Order.OrderStatus.CANCELLED && previousStatus == Order.OrderStatus.PAID) {
            cashService.createRefundFromOrder(savedOrder.getId());
        }

        // Bug #4 fix: disparar ingreso de caja automáticamente al marcar como PAID
        // Nota: En Punto de Venta, las órdenes ya se crean como PAID, pero esta lógica
        // se mantiene para órdenes creadas manualmente con otros flujos
        if (status == Order.OrderStatus.PAID && previousStatus != Order.OrderStatus.PAID) {
            cashService.createInflowFromOrder(savedOrder.getId());
            
            // Marcar pagos pendientes como completados (solo aplica a flujos no-Punto de Venta)
            for (Payment payment : order.getPayments()) {
                if (payment.getStatus() == Payment.PaymentStatus.PENDING) {
                    payment.setStatus(Payment.PaymentStatus.COMPLETED);
                    payment.setPaidAt(LocalDateTime.now());
                    paymentRepository.save(payment);
                }
            }
        }

        return convertToDTO(savedOrder);
    }

    @Override
    @Transactional
    public OrderDTO updateOrderStatus(Long id, OrderStatusUpdateDTO statusUpdateDTO) {
        return updateOrderStatus(id, statusUpdateDTO.getStatus());
    }
    
    @Override
    @Transactional
    public void cancelOrder(Long id) {
        updateOrderStatus(id, Order.OrderStatus.CANCELLED);
    }
    
    @Override
    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        return convertToDTO(order);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Order> orders = orderRepository.findByUser(user);
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByStatus(Order.OrderStatus status) {
        List<Order> orders = orderRepository.findByStatus(status);
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders(String search) {
        if (search == null || search.trim().isEmpty()) {
            List<Order> orders = orderRepository.findAllWithItems();
            return orders.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } else {
            List<Order> orders = orderRepository.findBySearch(search);
            return orders.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByCashSession(Long sessionId) {
        return orderRepository.findBySessionId(sessionId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderDTO> getAllOrdersPaginated(String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return orderRepository.findAll(pageable)
                    .map(this::convertToDTO);
        } else {
            return orderRepository.findBySearch(search, pageable)
                    .map(this::convertToDTO);
        }
    }
    
    private CashRegister resolveCashRegisterForNewOrder(Long cashRegisterId) {
        if (cashRegisterId != null) {
            CashRegister reg = cashRegisterRepository.findById(cashRegisterId)
                    .orElseThrow(() -> new RuntimeException("Caja no encontrada"));
            cashOpeningRepository.findByCashRegisterIdAndIsActiveTrue(reg.getId())
                    .orElseThrow(() -> new RuntimeException("La caja seleccionada no tiene una sesión abierta"));
            return reg;
        }
        List<CashOpening> open = cashOpeningRepository.findAllByIsActiveTrue();
        if (open.isEmpty()) {
            throw new RuntimeException("No hay ninguna sesión de caja abierta");
        }
        if (open.size() > 1) {
            throw new RuntimeException("Hay más de una caja abierta; indica cashRegisterId al registrar la venta");
        }
        CashOpening only = open.get(0);
        if (only.getCashRegister() == null) {
            throw new RuntimeException("Sesión de caja sin caja asignada; contacta al administrador");
        }
        return only.getCashRegister();
    }

    private void validateStatusTransition(Order.OrderStatus current, Order.OrderStatus newStatus) {
        // Lógica de validación de transiciones de estado
        switch (current) {
            case PENDING:
                if (newStatus != Order.OrderStatus.PAID && newStatus != Order.OrderStatus.CANCELLED) {
                    throw new RuntimeException("Invalid status transition from PENDING");
                }
                break;
            case PAID:
                if (newStatus != Order.OrderStatus.SHIPPED && newStatus != Order.OrderStatus.CANCELLED) {
                    throw new RuntimeException("Invalid status transition from PAID");
                }
                break;
            case SHIPPED:
                if (newStatus != Order.OrderStatus.DELIVERED) {
                    throw new RuntimeException("Invalid status transition from SHIPPED");
                }
                break;
            case DELIVERED:
            case CANCELLED:
                throw new RuntimeException("Cannot change status from " + current);
        }
    }
    
    private OrderDTO convertToDTO(Order order) {
        return OrderDTO.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .userName(order.getUser().getName())
                .status(order.getStatus())
                .total(order.getTotal())
                .orderItems(order.getOrderItems().stream()
                        .map(this::convertOrderItemToDTO)
                        .collect(Collectors.toList()))
                .payments(order.getPayments().stream()
                        .map(this::convertPaymentToDTO)
                        .collect(Collectors.toList()))
                .shippingAddress(order.getShippingAddress() != null ?
                        convertShippingAddressToDTO(order.getShippingAddress()) : null)
                .cashRegisterId(order.getCashRegister() != null ? order.getCashRegister().getId() : null)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
    
    private OrderItemDTO convertOrderItemToDTO(OrderItem item) {
        ProductVariant v = item.getProductVariant();
        List<ProductImage> images = productImageRepository.findByProductVariantIdOrderByIsMainDesc(v.getId());
        String imageUrl = images.isEmpty() ? null : images.get(0).getUrl();

        BigDecimal purchasePrice;
        boolean profitEstimated;
        if (item.getPurchasePrice() != null) {
            purchasePrice = item.getPurchasePrice();
            profitEstimated = Boolean.TRUE.equals(item.getPurchasePriceEstimated());
        } else {
            purchasePrice = resolveEffectivePurchasePrice(v);
            profitEstimated = purchasePrice != null;
        }

        return OrderItemDTO.builder()
                .id(item.getId())
                .orderId(item.getOrder().getId())
                .productVariantId(v.getId())
                .productName(v.getProduct().getName())
                // Bug #2 fix: null-safe para variantes DEFAULT sin color/talla
                .colorName(v.getColor() != null ? v.getColor().getName() : null)
                .sizeName(v.getSize() != null ? v.getSize().getName() : null)
                .imageUrl(imageUrl)
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .purchasePrice(purchasePrice)
                .profitEstimated(profitEstimated)
                .totalPrice(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    /** Precio de compra efectivo: variante → producto. */
    private BigDecimal resolveEffectivePurchasePrice(ProductVariant variant) {
        if (variant.getPurchasePrice() != null) {
            return variant.getPurchasePrice();
        }
        Product product = variant.getProduct();
        return product != null ? product.getPurchasePrice() : null;
    }
    
    private PaymentDTO convertPaymentToDTO(Payment payment) {
        return PaymentDTO.builder()
                .id(payment.getId())
                .orderId(payment.getOrder().getId())
                .method(payment.getMethod())
                .status(payment.getStatus())
                .amount(payment.getAmount())
                .paidAt(payment.getPaidAt())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
    
    private ShippingAddressDTO convertShippingAddressToDTO(ShippingAddress address) {
        return ShippingAddressDTO.builder()
                .id(address.getId())
                .orderId(address.getOrder().getId())
                .fullName(address.getFullName())
                .address(address.getAddress())
                .city(address.getCity())
                .phone(address.getPhone())
                .createdAt(address.getCreatedAt())
                .updatedAt(address.getUpdatedAt())
                .build();
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** Valor para persistir cuando el DTO omite el campo (evita NULL en columnas NOT NULL). */
    private static String blankToEmpty(String s) {
        if (s == null) return "";
        return s.trim();
    }

    /**
     * Bug #1 fix: calcula el precio efectivo de venta aplicando el descuento
     * si hay uno vigente en este momento. Si no, devuelve el sale_price normal.
     */
    /**
     * Precio de venta efectivo de una variante: usa el override de la variante
     * si está definido, si no hereda del producto, y aplica el descuento del
     * producto cuando está vigente.
     */
    private BigDecimal calculateEffectivePrice(ProductVariant variant) {
        Product product = variant.getProduct();
        BigDecimal basePrice = variant.getSalePrice() != null
                ? variant.getSalePrice()
                : product.getSalePrice();
        return applyProductDiscount(basePrice, product);
    }

    private BigDecimal applyProductDiscount(BigDecimal basePrice, Product product) {
        if (basePrice == null) return BigDecimal.ZERO;
        BigDecimal price = basePrice;
        if (product.getDiscountPercentage() != null
                && product.getDiscountStart() != null
                && product.getDiscountEnd() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (!now.isBefore(product.getDiscountStart()) && !now.isAfter(product.getDiscountEnd())) {
                BigDecimal factor = BigDecimal.ONE
                        .subtract(product.getDiscountPercentage()
                                .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP));
                price = price.multiply(factor).setScale(2, RoundingMode.HALF_UP);
            }
        }
        return price;
    }

    /**
     * Valida si el usuario tiene permisos para usar el precio personalizado.
     * Usa el precio de compra/venta efectivo de la variante (con fallback al producto).
     */
    private void validateCustomPricePermissions(BigDecimal customPrice, ProductVariant variant) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User not authenticated");
        }

        Set<String> authorities = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .collect(Collectors.toSet());

        Product product = variant.getProduct();
        BigDecimal effectiveSalePrice = calculateEffectivePrice(variant);
        BigDecimal effectivePurchasePrice = variant.getPurchasePrice() != null
                ? variant.getPurchasePrice()
                : product.getPurchasePrice();

        // Si el precio personalizado es menor al precio de venta efectivo
        if (customPrice.compareTo(effectiveSalePrice) < 0) {
            if (!authorities.contains("orders.modify_price_below_sale")) {
                throw new AccessDeniedException("You don't have permission to sell below sale price");
            }
        }

        // Si el precio personalizado es menor al precio de compra
        if (effectivePurchasePrice != null && customPrice.compareTo(effectivePurchasePrice) < 0) {
            if (!authorities.contains("orders.modify_price_below_purchase")) {
                throw new AccessDeniedException("You don't have permission to sell below purchase price");
            }
        }
        
        // Cero: ya exige permisos de venta bajo precio de venta y bajo costo (bloques anteriores).
        // Solo rechazar negativos.
        if (customPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El precio personalizado no puede ser negativo");
        }
    }

    private String buildVariantDescription(ProductVariant variant) {
        StringBuilder sb = new StringBuilder();
        if (variant.getColor() != null) sb.append(variant.getColor().getName());
        if (variant.getSize() != null) {
            if (!sb.isEmpty()) sb.append(" / ");
            sb.append(variant.getSize().getName());
        }
        if (variant.getSku() != null && !variant.getSku().isBlank()) {
            if (!sb.isEmpty()) sb.append(" (");
            else sb.append("(");
            sb.append("SKU: ").append(variant.getSku()).append(")");
        }
        return sb.isEmpty() ? "Variante única" : sb.toString();
    }
}
