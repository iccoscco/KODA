package com.yisus.store_backend.order.service;

import com.yisus.store_backend.common.exception.ResourceNotFoundException;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.order.repository.OrderRepository;
import com.yisus.store_backend.order.service.Impl.OrderServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderLocalScopeTest {
    @Mock private OrderRepository orders;
    @Mock private LocalScope scope;
    @InjectMocks private OrderServiceImpl service;

    @Test
    void detailNeverLoadsForeignOrderByBareId() {
        when(scope.id()).thenReturn(1L);
        assertThrows(ResourceNotFoundException.class, () -> service.getOrderById(200L));
        verify(orders).findByIdAndLocal_Id(200L, 1L);
    }
}
