import { NextResponse, type NextRequest } from "next/server";

// Filtro rápido: sin cookie de sesión no se entra a la historia ni al administrador.
// La validación real (sesión vigente, rol) se hace en el servidor en cada página y API.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("jq_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "?acceso=1";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/historia/:path*", "/admin/:path*"] };
