package com.yisus.store_backend.product.service;

import com.yisus.store_backend.category.repository.CategoryRepository;
import com.yisus.store_backend.common.exception.ResourceNotFoundException;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.service.Impl.ProductServiceImpl;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class ProductLocalScopeTest {
    @Test
    void detailUsesScopedLookupAndHidesForeignId() {
        ProductRepository products = mock(ProductRepository.class);
        LocalScope scope = mock(LocalScope.class);
        when(scope.id()).thenReturn(1L);
        ProductServiceImpl service = new ProductServiceImpl(products, mock(CategoryRepository.class),
                mock(ProductImageRepository.class), mock(ProductVariantRepository.class), scope);

        assertThrows(ResourceNotFoundException.class, () -> service.getProductById(200L));
        verify(products).findByIdAndLocal_Id(200L, 1L);
        verifyNoMoreInteractions(products);
    }
}
