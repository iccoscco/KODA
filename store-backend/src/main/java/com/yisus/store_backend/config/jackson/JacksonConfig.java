package com.yisus.store_backend.config.jackson;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

/**
 * Configuración de Jackson (v3 / {@code tools.jackson.*}) para que todas las
 * fechas de tipo {@link LocalDateTime} viajen como ISO-8601 terminadas en
 * {@code Z}. La JVM corre en UTC (ver {@code TZ=UTC} y
 * {@link java.util.TimeZone#setDefault(java.util.TimeZone)} en
 * {@code StoreBackendApplication}), por lo que los valores almacenados ya
 * están en UTC. El sufijo {@code Z} permite que el frontend
 * (JavaScript {@code new Date(...)}) reconozca la zona y convierta a hora
 * local del navegador automáticamente.
 *
 * <p>Salida: {@code "2026-04-22T21:01:58.438505Z"}.
 *
 * <p>Entrada: acepta cualquier ISO-8601 con o sin zona/offset
 * ({@code "...Z"}, {@code "...+00:00"}, {@code "...-05:00"},
 * {@code "2026-04-22T21:01:58"}, etc.). Si no trae zona se interpreta como UTC.
 *
 * <p>Al exponer un {@link SimpleModule} como {@link Bean}, Spring Boot lo
 * registra automáticamente en el {@code JsonMapper} usado por Spring MVC.
 */
@Configuration
public class JacksonConfig {

    private static final DateTimeFormatter OUT_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'");

    private static final DateTimeFormatter IN_FORMATTER = new DateTimeFormatterBuilder()
            .append(DateTimeFormatter.ISO_LOCAL_DATE)
            .appendLiteral('T')
            .appendValue(ChronoField.HOUR_OF_DAY, 2)
            .appendLiteral(':')
            .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
            .optionalStart()
            .appendLiteral(':')
            .appendValue(ChronoField.SECOND_OF_MINUTE, 2)
            .optionalStart()
            .appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true)
            .optionalEnd()
            .optionalEnd()
            .optionalStart()
            .appendOffset("+HH:MM", "Z")
            .optionalEnd()
            .optionalStart()
            .appendLiteral('Z')
            .optionalEnd()
            .toFormatter();

    @Bean
    public SimpleModule utcLocalDateTimeModule() {
        SimpleModule module = new SimpleModule("UtcLocalDateTimeModule");
        module.addSerializer(LocalDateTime.class, new UtcLocalDateTimeSerializer());
        module.addDeserializer(LocalDateTime.class, new UtcLocalDateTimeDeserializer());
        return module;
    }

    /**
     * Serializa {@link LocalDateTime} como ISO-8601 con sufijo {@code Z}.
     * Ej: {@code "2026-04-22T21:01:58.438505Z"}.
     */
    private static final class UtcLocalDateTimeSerializer extends ValueSerializer<LocalDateTime> {
        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializationContext ctxt)
                throws JacksonException {
            if (value == null) {
                gen.writeNull();
                return;
            }
            gen.writeString(value.format(OUT_FORMATTER));
        }
    }

    /**
     * Deserializa cualquier ISO-8601 a {@link LocalDateTime}. Si la cadena no
     * trae zona/offset, se interpreta como UTC (y los valores ya están en UTC
     * en la base de datos).
     */
    private static final class UtcLocalDateTimeDeserializer extends ValueDeserializer<LocalDateTime> {
        @Override
        public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt)
                throws JacksonException {
            String raw = p.getValueAsString();
            if (raw == null) {
                return null;
            }
            String s = raw.trim();
            if (s.isEmpty()) {
                return null;
            }
            return LocalDateTime.parse(s, IN_FORMATTER);
        }
    }
}
