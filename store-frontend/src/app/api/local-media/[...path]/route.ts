import { NextRequest } from "next/server";

// Bajo /api para recibir también la cookie access_token (Path=/api).
// Las etiquetas img no pueden enviar X-Local-Id. Este puente fija el backend
// de destino y delega la autorización de archivo y local al servidor Spring.
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    if (path.length !== 2 || path.some((p) => !p || p === "." || p === ".." || /[\\/]/.test(p))) {
        return new Response(null, { status: 404 });
    }
    const localId = request.nextUrl.searchParams.get("localId");
    if (localId && !/^[1-9]\d*$/.test(localId)) return new Response(null, { status: 400 });
    const headers = new Headers({ Cookie: request.headers.get("cookie") ?? "" });
    if (localId) headers.set("X-Local-Id", localId);
    try {
        const backend = (process.env.BACKEND_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
        const result = await fetch(`${backend}/api/uploads/${path.map(encodeURIComponent).join("/")}`, {
            headers, cache: "no-store", redirect: "error",
        });
        if (!result.ok) return new Response(null, { status: result.status });
        return new Response(result.body, { headers: {
            "Content-Type": result.headers.get("content-type") ?? "application/octet-stream",
            "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        } });
    } catch { return new Response(null, { status: 502 }); }
}
