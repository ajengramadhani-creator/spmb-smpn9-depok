import type { NextConfig } from "next";
import path from "node:path";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self'${process.env.NODE_ENV === "production" ? "" : " ws: wss:"}`,
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { cpus: 1 },
  webpack(config, { dev }) {
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/lib/auth/development-demo-providers": path.resolve(process.cwd(), "src/lib/auth/production-demo-providers.ts"),
        "@/lib/auth/development-login-action": path.resolve(process.cwd(), "src/lib/auth/production-development-login-action.ts"),
        "@/components/auth/development-quick-login": path.resolve(process.cwd(), "src/components/auth/production-quick-login.tsx"),
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;