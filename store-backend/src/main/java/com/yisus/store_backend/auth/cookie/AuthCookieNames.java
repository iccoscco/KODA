package com.yisus.store_backend.auth.cookie;

import lombok.experimental.UtilityClass;

@UtilityClass
public class AuthCookieNames {
    public static final String ACCESS_TOKEN = "access_token";
    public static final String REFRESH_TOKEN = "refresh_token";
    /** Marca sesión activa (Path=/); el middleware de Next puede leerla en el mismo host. */
    public static final String AUTH_SESSION = "auth_session";
}
