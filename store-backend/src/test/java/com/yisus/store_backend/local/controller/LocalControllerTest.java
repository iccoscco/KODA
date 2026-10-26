package com.yisus.store_backend.local.controller;

import com.yisus.store_backend.local.model.Local;
import com.yisus.store_backend.local.repository.LocalRepository;
import com.yisus.store_backend.local.service.LocalScope;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LocalControllerTest {
    private final LocalScope localScope = mock(LocalScope.class);
    private final LocalRepository localRepository = mock(LocalRepository.class);
    private final LocalController controller = new LocalController(localScope, localRepository);

    @Test
    void currentReturnsResolvedLocalAndSwitchCapability() {
        Local local = Local.builder().id(7L).code("LOCAL-007").name("Local 7").active(true).build();
        when(localScope.local()).thenReturn(local);
        when(localScope.canSwitch()).thenReturn(true);

        var response = controller.current();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(7L, response.getBody().id());
        assertEquals("LOCAL-007", response.getBody().code());
        assertEquals("Local 7", response.getBody().name());
        assertEquals(true, response.getBody().canSwitch());
    }

    @Test
    void selectorListsOnlyActiveLocals() {
        Local local = Local.builder().id(3L).code("LOCAL-003").name("Local 3").active(true).build();
        when(localRepository.findAllByActiveTrueOrderByNameAsc()).thenReturn(List.of(local));

        var response = controller.listActive();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals(3L, response.getBody().get(0).id());
        assertEquals(true, response.getBody().get(0).canSwitch());
        verify(localRepository).findAllByActiveTrueOrderByNameAsc();
    }
}
