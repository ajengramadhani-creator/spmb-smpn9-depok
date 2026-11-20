import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const roleByPath = [
  { prefix: "/siswa", role: "SISWA" },
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/kepsek", role: "KEPSEK" },
] as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/masuk" || pathname === "/kepsek/masuk") return NextResponse.next();

  const required = roleByPath.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!required) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
  });
  if (!token) {
    const loginPath = required.role === "ADMIN" ? "/admin/masuk" : required.role === "KEPSEK" ? "/kepsek/masuk" : "/masuk";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
  if (token.role !== required.role) return NextResponse.redirect(new URL("/akses-ditolak", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/siswa/:path*", "/admin/:path*", "/kepsek/:path*"],
};
