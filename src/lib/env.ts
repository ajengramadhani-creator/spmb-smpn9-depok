import { z } from "zod";

const optionalText = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  BLOB_READ_WRITE_TOKEN: optionalText,
  BLOB_ENCRYPTION_KEY: optionalText,
  RESEND_API_KEY: optionalText,
  EMAIL_FROM: z.string().default("SPMB SMPN 9 Depok <noreply@example.com>"),
  MIDTRANS_SERVER_KEY: optionalText,
  MIDTRANS_CLIENT_KEY: optionalText,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalText,
  DEMO_PASSWORD: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(12).optional()),
});

export function getEnv() {
  return envSchema.parse(process.env);
}