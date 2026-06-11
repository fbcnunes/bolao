import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    
    if (token) {
        if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "MASTER") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        if (req.nextUrl.pathname.startsWith("/master") && token.role !== "MASTER") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // Master vai direto para o painel
        if (token.role === "MASTER" && req.nextUrl.pathname === "/") {
            return NextResponse.redirect(new URL("/master", req.url));
        }

        if (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/cadastro") {
            const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
            const safeCallbackUrl = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : null;
            return NextResponse.redirect(new URL(safeCallbackUrl ?? (token.role === "MASTER" ? "/master" : "/"), req.url));
        }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Rotas públicas que não precisam de autenticação
        const publicRoutes = ["/login", "/cadastro", "/entrar", "/esqueci-senha", "/redefinir-senha", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/jobs", "/api/boloes/preview"];
        if (publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
            return true;
        }
        
        // Todas as outras rotas exigem autenticação
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico and public assets
     */
    "/((?!api/auth/session|api/auth/providers|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
