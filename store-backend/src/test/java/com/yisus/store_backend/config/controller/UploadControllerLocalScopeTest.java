package com.yisus.store_backend.config.controller;

import com.yisus.store_backend.common.exception.ResourceNotFoundException;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.storeconfig.repository.StoreConfigRepository;
import com.yisus.store_backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UploadControllerLocalScopeTest {
    private final LocalScope localScope = mock(LocalScope.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ProductImageRepository images = mock(ProductImageRepository.class);
    private final StoreConfigRepository configs = mock(StoreConfigRepository.class);
    private final UploadController controller = new UploadController(localScope, users, images, configs);

    @Test
    void fileFromAnotherLocalIsHiddenAsNotFound() throws Exception {
        when(localScope.id()).thenReturn(1L);
        when(users.existsByAvatarUrlAndLocal_Id("/uploads/avatars/avatar.png", 1L)).thenReturn(false);
        when(images.existsByUrlAndProductVariant_Product_Local_Id("/uploads/avatars/avatar.png", 1L))
                .thenReturn(false);
        when(configs.existsByLogoUrlAndLocal_Id("/uploads/avatars/avatar.png", 1L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> controller.getUpload("/avatars/avatar.png"));
        verify(users).existsByAvatarUrlAndLocal_Id("/uploads/avatars/avatar.png", 1L);
        verify(images).existsByUrlAndProductVariant_Product_Local_Id("/uploads/avatars/avatar.png", 1L);
        verify(configs).existsByLogoUrlAndLocal_Id("/uploads/avatars/avatar.png", 1L);
    }

    @Test
    void pathTraversalIsRejected() {
        when(localScope.id()).thenReturn(1L);

        assertThrows(ResourceNotFoundException.class, () -> controller.getUpload("/avatars/../../secret"));
    }
}
