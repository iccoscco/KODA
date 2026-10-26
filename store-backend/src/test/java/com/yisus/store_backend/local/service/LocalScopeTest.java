package com.yisus.store_backend.local.service;

import com.yisus.store_backend.local.model.Local;
import com.yisus.store_backend.local.repository.LocalRepository;
import com.yisus.store_backend.role.model.Role;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LocalScopeTest {
    private final LocalRepository locals = mock(LocalRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final LocalScope scope = new LocalScope(locals, users);
    private MockHttpServletRequest request;

    @BeforeEach
    void requestContext() {
        request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void clearContext() {
        RequestContextHolder.resetRequestAttributes();
        SecurityContextHolder.clearContext();
    }

    @Test
    void ordinaryUserGetsAssignedLocal() {
        authenticate("USER");
        when(users.findLocalIdById(7L)).thenReturn(Optional.of(1L));
        when(locals.findById(1L)).thenReturn(Optional.of(local(1L, true)));
        assertEquals(1L, scope.id());
    }

    @Test
    void ordinaryUserCannotForceAnotherLocal() {
        authenticate("USER");
        request.addHeader("X-Local-Id", "2");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, scope::id);
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }

    @Test
    void ordinaryUserMayEchoOnlyTheirAssignedLocal() {
        authenticate("USER");
        request.addHeader("X-Local-Id", "1");
        when(users.findLocalIdById(7L)).thenReturn(Optional.of(1L));
        when(locals.findById(1L)).thenReturn(Optional.of(local(1L, true)));

        assertEquals(1L, scope.id());
    }

    @Test
    void superAdminMustSelectLocal() {
        authenticate("SUPERADMIN");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, scope::id);
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        assertEquals("LOCAL_REQUIRED", error.getReason());
    }

    @Test
    void superAdminCanSelectActiveLocalOnly() {
        authenticate("SUPERADMIN");
        request.addHeader("X-Local-Id", "2");
        when(locals.findById(2L)).thenReturn(Optional.of(local(2L, true)));
        assertEquals(2L, scope.id());
    }

    @Test
    void inactiveLocalIsRejected() {
        authenticate("SUPERADMIN");
        request.addHeader("X-Local-Id", "2");
        when(locals.findById(2L)).thenReturn(Optional.of(local(2L, false)));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, scope::id);
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    private void authenticate(String roleName) {
        User user = User.builder().id(7L).email("qa@local.test")
                .role(Role.builder().name(roleName).build()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private Local local(Long id, boolean active) {
        return Local.builder().id(id).code("LOCAL-" + id).name("Local " + id).active(active).build();
    }
}
