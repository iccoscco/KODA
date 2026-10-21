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

/**
 * Contexto mínimo para consultas de Backend 1. Backend 2 podrá ampliarlo para
 * cubrir todos los endpoints; nunca se confía en un local_id enviado en DTOs.
 */
@Service
@RequiredArgsConstructor
public class LocalScope {
    private final LocalRepository localRepository;
    private final UserRepository userRepository;

    public Long id() {
        User actor = actor();
        String header = request().getHeader("X-Local-Id");
        boolean superAdmin = actor.getRole() != null && "SUPERADMIN".equals(actor.getRole().getName());
        if (!superAdmin) {
            if (header != null && !header.isBlank()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede cambiar de local");
            }
            Long assigned = userRepository.findLocalIdById(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario sin local asignado"));
            Local local = localRepository.findById(assigned)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Local inexistente"));
            if (!Boolean.TRUE.equals(local.getActive())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Local inactivo");
            }
            return assigned;
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
        return local.getId();
    }

    public Local local() {
        return localRepository.findById(id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Local inexistente"));
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
