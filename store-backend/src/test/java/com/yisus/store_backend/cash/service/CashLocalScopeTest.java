package com.yisus.store_backend.cash.service;

import com.yisus.store_backend.cash.repository.CashRegisterRepository;
import com.yisus.store_backend.cash.service.Impl.CashServiceImpl;
import com.yisus.store_backend.common.exception.ResourceNotFoundException;
import com.yisus.store_backend.local.service.LocalScope;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashLocalScopeTest {
    @Mock private CashRegisterRepository registers;
    @Mock private LocalScope scope;
    @InjectMocks private CashServiceImpl service;

    @Test
    void balanceCannotReadRegisterFromAnotherLocal() {
        when(scope.id()).thenReturn(1L);
        assertThrows(ResourceNotFoundException.class, () -> service.getCurrentBalance(200L));
        verify(registers).findByIdAndLocal_Id(200L, 1L);
    }
}
