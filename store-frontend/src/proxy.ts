import { NextRequest, NextResponse } from "next/server";

/** Login/register: permiten invitados; con sesión se redirige al dashboard. */
const AUTH_ENTRY_PATHS = ["/login", "/register"];

/** Rutas accesibles sin token (login, registro, páginas informativas). */
const PUBLIC_PATHS = [...AUTH_ENTRY_PATHS, "/coming-soon"];

/** Cookie httpOnly que el backend define en Path=/ (misma sesión que JWT en /api). */
const SESSION_COOKIE = "auth_session";

export function proxy(request: NextRequest) {
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    const { pathname } = request.nextUrl;

    const isAuthEntry = AUTH_ENTRY_PATHS.some((path) => pathname.startsWith(path));
    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

    if (isAuthEntry && session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (!isPublic && !session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
