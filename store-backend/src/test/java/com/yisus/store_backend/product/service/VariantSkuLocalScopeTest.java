package com.yisus.store_backend.product.service;

import com.yisus.store_backend.common.exception.DuplicateResourceException;
import com.yisus.store_backend.local.model.Local;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.product.dto.ProductVariantCreateDTO;
import com.yisus.store_backend.product.model.Product;
import com.yisus.store_backend.product.model.ProductVariant;
import com.yisus.store_backend.product.repository.ColorRepository;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.product.repository.SizeRepository;
import com.yisus.store_backend.product.service.Impl.ProductVariantServiceImpl;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VariantSkuLocalScopeTest {
    private final ProductVariantRepository variants = mock(ProductVariantRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final LocalScope scope = mock(LocalScope.class);
    private final ProductVariantServiceImpl service = new ProductVariantServiceImpl(variants, products,
            mock(ColorRepository.class), mock(SizeRepository.class), mock(ProductImageRepository.class),
            mock(StockMovementService.class), scope);

    private ProductVariantCreateDTO request() {
        return ProductVariantCreateDTO.builder().productId(9L).sku("SKU-COMPARTIDO")
                .stock(0).minStock(0).build();
    }

    private void setUpLocal() {
        when(scope.id()).thenReturn(1L);
        Product product = Product.builder().id(9L).name("Producto A")
                .local(Local.builder().id(1L).build()).build();
        when(products.findByIdAndLocal_Id(9L, 1L)).thenReturn(Optional.of(product));
    }

    @Test
    void acceptsSkuUsedOnlyInAnotherLocalAndSavesMatchingLocal() {
        setUpLocal();
        when(variants.save(any(ProductVariant.class))).thenAnswer(invocation -> {
            ProductVariant variant = invocation.getArgument(0);
            variant.setId(77L);
            return variant;
        });

        service.createProductVariant(request());

        var captor = org.mockito.ArgumentCaptor.forClass(ProductVariant.class);
        verify(variants).existsBySkuAndProduct_Local_Id("SKU-COMPARTIDO", 1L);
        verify(variants).save(captor.capture());
        assertEquals(1L, captor.getValue().getLocal().getId());
    }

    @Test
    void rejectsSkuAlreadyUsedInCurrentLocal() {
        setUpLocal();
        when(variants.existsBySkuAndProduct_Local_Id("SKU-COMPARTIDO", 1L)).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> service.createProductVariant(request()));
        verify(variants, never()).save(any());
    }
}
