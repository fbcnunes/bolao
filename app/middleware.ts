import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth") || req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/cadastro");
    
    if (token) {
        if (req.nextUrl.pathname.startsWith("/admin") && token.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", req.url));
        }
        
        if (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/cadastro") {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Rotas públicas que não precisam de autenticação
        const publicRoutes = ["/login", "/cadastro", "/api/auth/register"];
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
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth/session|api/auth/providers|_next/static|_next/image|favicon.ico).*)",
  ],
};
