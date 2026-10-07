package com.yisus.store_backend.auth.cookie;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AuthCookieService {

    private static final String API_COOKIE_PATH = "/api";
    private static final String ROOT_PATH = "/";

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Value("${app.auth.cookie.secure:false}")
    private boolean secure;

    @Value("${app.auth.cookie.same-site:Lax}")
    private String sameSite;

    @Value("${app.auth.cookie.domain:}")
    private String domain;

    public void addAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        for (ResponseCookie c : buildAuthCookies(accessToken, refreshToken)) {
            response.addHeader(HttpHeaders.SET_COOKIE, c.toString());
        }
    }

    public void clearAuthCookies(HttpServletResponse response) {
        for (ResponseCookie c : buildClearCookies()) {
            response.addHeader(HttpHeaders.SET_COOKIE, c.toString());
        }
    }

    public List<ResponseCookie> buildAuthCookies(String accessToken, String refreshToken) {
        List<ResponseCookie> list = new ArrayList<>();
        long accessMaxAgeSec = Math.max(1, accessTokenExpirationMs / 1000);
        long refreshMaxAgeSec = Math.max(1, refreshTokenExpirationMs / 1000);

        list.add(buildCookie(AuthCookieNames.ACCESS_TOKEN, accessToken, API_COOKIE_PATH, accessMaxAgeSec));
        list.add(buildCookie(AuthCookieNames.REFRESH_TOKEN, refreshToken, API_COOKIE_PATH, refreshMaxAgeSec));
        list.add(buildCookie(AuthCookieNames.AUTH_SESSION, "1", ROOT_PATH, refreshMaxAgeSec));
        return list;
    }

    private List<ResponseCookie> buildClearCookies() {
        List<ResponseCookie> list = new ArrayList<>();
        list.add(clearCookie(AuthCookieNames.ACCESS_TOKEN, API_COOKIE_PATH));
        list.add(clearCookie(AuthCookieNames.REFRESH_TOKEN, API_COOKIE_PATH));
        list.add(clearCookie(AuthCookieNames.AUTH_SESSION, ROOT_PATH));
        return list;
    }

    private ResponseCookie buildCookie(String name, String value, String path, long maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(name, value)
                .path(path)
                .httpOnly(true)
                .secure(secure)
                .maxAge(maxAgeSeconds)
                .sameSite(sameSite);
        if (domain != null && !domain.isBlank()) {
            b.domain(domain.trim());
        }
        return b.build();
    }

    private ResponseCookie clearCookie(String name, String path) {
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(name, "")
                .path(path)
                .httpOnly(true)
                .secure(secure)
                .maxAge(0)
                .sameSite(sameSite);
        if (domain != null && !domain.isBlank()) {
            b.domain(domain.trim());
        }
        return b.build();
    }
}
