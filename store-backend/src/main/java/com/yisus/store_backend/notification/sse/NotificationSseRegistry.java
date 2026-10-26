package com.yisus.store_backend.notification.sse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class NotificationSseRegistry {

    private record Channel(Long userId, Long localId) {}

    private final Map<Channel, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    // ── One-time tickets ──────────────────────────────────────────────────────

    private record Ticket(Long userId, Long localId, Instant expiresAt) {}

    public record TicketIdentity(Long userId, Long localId) {}

    /** Tickets de un solo uso: UUID → (userId, expiresAt). */
    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();

    private static final long TICKET_TTL_SECONDS = 30;

    /** Genera un ticket de un solo uso válido por 30 segundos para el userId dado. */
    public String createTicket(Long userId, Long localId) {
        purgeExpiredTickets();
        String ticket = UUID.randomUUID().toString();
        tickets.put(ticket, new Ticket(userId, localId, Instant.now().plusSeconds(TICKET_TTL_SECONDS)));
        return ticket;
    }

    /**
     * Valida y consume el ticket. Devuelve el userId asociado o null si el ticket
     * no existe, ya fue usado, o expiró.
     */
    public TicketIdentity consumeTicket(String ticket) {
        Ticket t = tickets.remove(ticket);
        if (t == null) return null;
        if (Instant.now().isAfter(t.expiresAt())) return null;
        return new TicketIdentity(t.userId(), t.localId());
    }

    private void purgeExpiredTickets() {
        Instant now = Instant.now();
        tickets.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
    }

    public SseEmitter subscribe(Long userId, Long localId) {
        // Timeout largo; el cliente reconectará si la conexión cae
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L); // 30 min
        Channel channel = new Channel(userId, localId);

        emitters.computeIfAbsent(channel, k -> ConcurrentHashMap.newKeySet()).add(emitter);

        Runnable cleanup = () -> removeEmitter(channel, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // Evento inicial de handshake para que el browser confirme la conexión
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            removeEmitter(channel, emitter);
        }

        log.debug("SSE subscribed userId={} localId={}", userId, localId);
        return emitter;
    }

    /**
     * Envía un heartbeat (comentario SSE, líneas que empiezan con ":") a todos los
     * emitters activos cada 15 segundos. Mantiene la conexión viva frente a
     * reverse proxies (nginx, cloudflare, etc.) que cierran conexiones idle, y
     * además detecta emitters muertos de forma temprana para poder limpiarlos.
     * <p>
     * El comentario no dispara eventos en el {@code EventSource} del navegador,
     * así que no tiene efecto en el cliente.
     */
    @Scheduled(fixedDelay = 15_000L)
    public void sendHeartbeat() {
        if (emitters.isEmpty()) return;

        for (Map.Entry<Channel, Set<SseEmitter>> entry : emitters.entrySet()) {
            Channel channel = entry.getKey();
            Set<SseEmitter> userEmitters = entry.getValue();
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event().comment("keepalive"));
                } catch (Exception e) {
                    dead.add(emitter);
                }
            }
            if (!dead.isEmpty()) {
                userEmitters.removeAll(dead);
                if (userEmitters.isEmpty()) emitters.remove(channel);
                log.debug("SSE heartbeat: removed {} dead emitters for userId={} localId={}",
                        dead.size(), channel.userId(), channel.localId());
            }
        }
    }

    /** Envía un evento JSON a todos los emitters activos de un usuario. */
    public void sendToUser(Long userId, Long localId, Object payload) {
        Channel channel = new Channel(userId, localId);
        Set<SseEmitter> userEmitters = emitters.get(channel);
        if (userEmitters == null || userEmitters.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            log.error("SSE serialize error", e);
            return;
        }

        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(json));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        userEmitters.removeAll(dead);
    }

    /** Envía a todos los usuarios que tengan emitters activos. */
    public void sendToAll(Long localId, Object payload) {
        emitters.keySet().stream().filter(channel -> channel.localId().equals(localId))
                .forEach(channel -> sendToUser(channel.userId(), localId, payload));
    }

    private void removeEmitter(Channel channel, SseEmitter emitter) {
        Set<SseEmitter> userEmitters = emitters.get(channel);
        if (userEmitters != null) {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) emitters.remove(channel);
        }
        log.debug("SSE removed emitter userId={} localId={}", channel.userId(), channel.localId());
    }
}
