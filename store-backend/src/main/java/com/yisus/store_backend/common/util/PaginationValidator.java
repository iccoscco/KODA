package com.yisus.store_backend.common.util;

import com.yisus.store_backend.common.dto.PaginatedResponse;
import org.springframework.data.domain.Page;

public class PaginationValidator {
    private PaginationValidator() {
        throw new InstantiationError("Utility class");
    }

    public static void validatePaginationParams(Integer limit, Integer offset) {
        if (limit != null && offset != null) {
            if (limit <= 0) {
                throw new IllegalArgumentException("El parámetro 'limit' debe ser mayor que 0");
            }
            if (offset < 0) {
                throw new IllegalArgumentException("El parámetro 'offset' no puede ser negativo");
            }
        }
    }

    public static <T> PaginatedResponse<T> buildPaginatedResponse(
            Page<T> page,
            int limit,
            int offset,
            String baseUrl,
            String queryString
    ) {
        String cleanUrl = baseUrl.split("\\?")[0];

        String next = page.hasNext()
                ? buildPaginationUrl(cleanUrl, limit, offset + limit, queryString)
                : null;

        String previous = page.hasPrevious()
                ? buildPaginationUrl(cleanUrl, limit, Math.max(0, offset - limit), queryString)
                : null;

        return PaginatedResponse.<T>builder()
                .count(page.getTotalElements())
                .next(next)
                .previous(previous)
                .results(page.getContent())
                .build();
    }

    public static String buildPaginationUrl(String baseUrl, int limit, int offset, String queryString) {
        StringBuilder url = new StringBuilder(baseUrl)
                .append("?limit=").append(limit)
                .append("&offset=").append(offset);

        if (queryString != null && !queryString.isEmpty()) {
            String[] params = queryString.split("&");
            for (String param : params) {
                if (!param.startsWith("limit=") && !param.startsWith("offset=")) {
                    url.append("&").append(param);
                }
            }
        }

        return url.toString();
    }
}
