import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const roleByPath = [
  { prefix: "/siswa", role: "SISWA" },
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/kepsek", role: "KEPSEK" },
] as const;

const loginRoleByPath: Record<string, (typeof roleByPath)[number]["role"]> = {
  "/masuk": "SISWA",
  "/admin/masuk": "ADMIN",
  "/kepsek/masuk": "KEPSEK",
};

const dashboardByRole: Record<(typeof roleByPath)[number]["role"], string> = {
  SISWA: "/siswa",
  ADMIN: "/admin",
  KEPSEK: "/kepsek",
};

const loginByRole: Record<(typeof roleByPath)[number]["role"], string> = {
  SISWA: "/masuk",
  ADMIN: "/admin/masuk",
  KEPSEK: "/kepsek/masuk",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const required = roleByPath.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const loginRole = loginRoleByPath[pathname];
  if (!required && !loginRole) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
  });
  if (!token) {
    if (loginRole) return NextResponse.next();
    if (!required) return NextResponse.next();
    return NextResponse.redirect(new URL(loginByRole[required.role], request.url));
  }
  if (typeof token.role !== "string" || !Object.hasOwn(dashboardByRole, token.role)) {
    return NextResponse.redirect(new URL("/akses-ditolak", request.url));
  }
  const dashboardPath = dashboardByRole[token.role as keyof typeof dashboardByRole];
  if (loginRole || (required && token.role !== required.role)) {
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/masuk", "/siswa/:path*", "/admin/:path*", "/kepsek/:path*"],
};
