package com.yisus.store_backend.order.controller;

import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.order.dto.OrderCreateDTO;
import com.yisus.store_backend.order.dto.OrderDTO;
import com.yisus.store_backend.order.dto.OrderStatusUpdateDTO;
import com.yisus.store_backend.order.model.Order;
import com.yisus.store_backend.order.service.OrderService;
import com.yisus.store_backend.order.service.SaleReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import jakarta.servlet.http.HttpServletRequest;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;

import java.util.List;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Tag(name = "Order", description = "Order endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class OrderController {
    
    private final OrderService orderService;
    private final SaleReceiptService saleReceiptService;
    private final com.yisus.store_backend.order.service.EscPosPrintService escPosPrintService;

    @PostMapping
    @PreAuthorize("hasAuthority('orders.create')")
    @Operation(summary = "Create order", description = "Create a new order with items, payments and shipping")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Order created successfully", 
            content = @Content(schema = @Schema(implementation = OrderDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input or insufficient stock"),
        @ApiResponse(responseCode = "404", description = "User or product variant not found")
    })
    public ResponseEntity<OrderDTO> createOrder(@Valid @RequestBody OrderCreateDTO request) {
        OrderDTO order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Get order by ID", description = "Retrieve a specific order by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Order retrieved successfully", 
            content = @Content(schema = @Schema(implementation = OrderDTO.class))),
        @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Long id) {
        OrderDTO order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Get orders by user", description = "Retrieve all orders for a specific user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Orders retrieved successfully", 
            content = @Content(schema = @Schema(implementation = OrderDTO.class))),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<List<OrderDTO>> getOrdersByUser(@PathVariable Long userId) {
        List<OrderDTO> orders = orderService.getOrdersByUser(userId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Get orders by status", description = "Retrieve all orders with a specific status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Orders retrieved successfully", 
            content = @Content(schema = @Schema(implementation = OrderDTO.class)))
    })
    public ResponseEntity<List<OrderDTO>> getOrdersByStatus(@PathVariable Order.OrderStatus status) {
        List<OrderDTO> orders = orderService.getOrdersByStatus(status);
        return ResponseEntity.ok(orders);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Get all orders", description = "Retrieve all orders with optional pagination and search")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Orders retrieved successfully", 
            content = @Content(schema = @Schema(implementation = OrderDTO.class))),
        @ApiResponse(responseCode = "200", description = "Orders retrieved successfully (paginated)", 
            content = @Content(schema = @Schema(implementation = PaginatedResponse.class)))
    })
    public ResponseEntity<?> getAllOrders(@RequestParam(required = false) Integer limit,
                                          @RequestParam(required = false) Integer offset,
                                          @RequestParam(required = false) String search,
                                          HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").descending());
            Page<OrderDTO> orderPage = orderService.getAllOrdersPaginated(search, pageable);
            PaginatedResponse<OrderDTO> response = PaginationValidator.buildPaginatedResponse(
                    orderPage, limit, offset, request.getRequestURI(), request.getQueryString()
            );
            return ResponseEntity.ok(response);
        }
        else {
            List<OrderDTO> orders = orderService.getAllOrders(search);
            return ResponseEntity.ok(orders);
        }
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('orders.update')")
    @Operation(summary = "Update order status", description = "Update the status of an existing order")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Order status updated successfully", 
            content = @Content(schema = @Schema(implementation = OrderDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid status transition"),
        @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<OrderDTO> updateOrderStatus(
            @PathVariable Long id, 
            @Valid @RequestBody OrderStatusUpdateDTO statusUpdateDTO) {
        OrderDTO order = orderService.updateOrderStatus(id, statusUpdateDTO);
        return ResponseEntity.ok(order);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('orders.update')")
    @Operation(summary = "Cancel order", description = "Cancel an order and restore stock")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Order cancelled successfully"),
        @ApiResponse(responseCode = "404", description = "Order not found"),
        @ApiResponse(responseCode = "400", description = "Order cannot be cancelled")
    })
    public ResponseEntity<MessageResponse> cancelOrder(@PathVariable Long id) {
        orderService.cancelOrder(id);
        return ResponseEntity.ok(new MessageResponse("Order cancelled successfully"));
    }

    @GetMapping("/{id}/receipt")
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Generate order receipt PDF", description = "Returns a PDF receipt for the given order (88mm thermal format)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "PDF generated successfully"),
        @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<byte[]> getOrderReceipt(@PathVariable Long id) {
        OrderDTO order = orderService.getOrderById(id);
        byte[] pdf = saleReceiptService.generateReceipt(order);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"recibo-" + id + ".pdf\"");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @GetMapping("/by-session")
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Get orders by cash session", description = "Returns orders linked to a specific cash opening session")
    public ResponseEntity<List<OrderDTO>> getOrdersByCashSession(@RequestParam Long sessionId) {
        return ResponseEntity.ok(orderService.getOrdersByCashSession(sessionId));
    }

    @PostMapping("/{id}/print-direct")
    @PreAuthorize("hasAuthority('orders.read')")
    @Operation(summary = "Print order directly to ESC/POS thermal printer via TCP/IP")
    public ResponseEntity<com.yisus.store_backend.common.dto.MessageResponse> printOrderDirectly(@PathVariable Long id) {
        OrderDTO order = orderService.getOrderById(id);
        escPosPrintService.printOrderDirect(order);
        return ResponseEntity.ok(new com.yisus.store_backend.common.dto.MessageResponse("Impresión enviada correctamente a la ticketera"));
    }
}
