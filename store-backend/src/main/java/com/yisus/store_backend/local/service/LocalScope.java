package com.yisus.store_backend.local.service;

import com.yisus.store_backend.local.model.Local;
import com.yisus.store_backend.local.repository.LocalRepository;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/** Resuelve el único local autorizado para una petición operativa. */
@Service
@RequiredArgsConstructor
public class LocalScope {
    private final LocalRepository localRepository;
    private final UserRepository userRepository;

    public Long id() {
        return local().getId();
    }

    public Local local() {
        User actor = actor();
        String header = request().getHeader("X-Local-Id");
        if (!canSwitch(actor)) {
            Long assigned = userRepository.findLocalIdById(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario sin local asignado"));
            if (header != null && !header.isBlank()) {
                try {
                    if (Long.parseLong(header) != assigned) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede cambiar de local");
                    }
                } catch (NumberFormatException ex) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede cambiar de local");
                }
            }
            Local local = localRepository.findById(assigned)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Local inexistente"));
            if (!Boolean.TRUE.equals(local.getActive())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Local inactivo");
            }
            return local;
        }
        if (header == null || header.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "LOCAL_REQUIRED");
        }
        final long requested;
        try {
            requested = Long.parseLong(header);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Local-Id inválido");
        }
        Local local = localRepository.findById(requested)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Local inexistente"));
        if (!Boolean.TRUE.equals(local.getActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Local inactivo");
        }
        return local;
    }

    public boolean canSwitch() {
        return canSwitch(actor());
    }

    private boolean canSwitch(User actor) {
        return actor.getRole() != null && "SUPERADMIN".equals(actor.getRole().getName());
    }

    private User actor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticación requerida");
        }
        return user;
    }

    private HttpServletRequest request() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Petición HTTP requerida");
    }
}
