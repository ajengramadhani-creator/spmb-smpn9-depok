import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { emitKeypressEvents } from "node:readline";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

for (const filename of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), filename);
  if (existsSync(path)) process.loadEnvFile(path);
}

export const prisma = new PrismaClient();

export class StaffInputError extends Error {}

export function parseArguments(requiredNames: string[]) {
  const values = new Map<string, string>();
  for (const argument of process.argv.slice(2)) {
    const match = /^--([a-z-]+)=(.+)$/.exec(argument);
    if (!match || !requiredNames.includes(match[1]) || values.has(match[1])) {
      throw new StaffInputError(`Argumen tidak valid. Gunakan: ${requiredNames.map((name) => `--${name}=...`).join(" ")}`);
    }
    values.set(match[1], match[2]);
  }
  if (values.size !== requiredNames.length || requiredNames.some((name) => !values.has(name))) {
    throw new StaffInputError(`Argumen wajib: ${requiredNames.map((name) => `--${name}=...`).join(" ")}`);
  }
  return Object.fromEntries(values);
}

export function validateEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StaffInputError("Masukkan alamat email yang valid.");
  }
  return email;
}

export function parseStaffRole(value: string): Role {
  if (value !== Role.ADMIN && value !== Role.KEPSEK) {
    throw new StaffInputError("Peran harus ADMIN atau KEPSEK.");
  }
  return value;
}

export async function promptStrongPassword() {
  const password = await promptHidden("Kata sandi baru");
  const confirmation = await promptHidden("Konfirmasi kata sandi");
  if (password !== confirmation) throw new StaffInputError("Konfirmasi kata sandi tidak sama.");
  if (password.length < 12
    || !/[A-Z]/.test(password)
    || !/[a-z]/.test(password)
    || !/[0-9]/.test(password)
    || !/[^A-Za-z0-9]/.test(password)) {
    throw new StaffInputError("Kata sandi minimal 12 karakter dan harus memuat huruf besar, huruf kecil, angka, serta simbol.");
  }
  return bcrypt.hash(password, 12);
}

function promptHidden(message: string) {
  const input = process.stdin;
  if (!input.isTTY) throw new StaffInputError("Perintah ini memerlukan terminal interaktif untuk membaca kata sandi.");
  emitKeypressEvents(input);

  return new Promise<string>((resolveValue, reject) => {
    let value = "";
    let settled = false;
    const cleanup = () => {
      input.off("keypress", onKeypress);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolveValue(value);
    };
    const onKeypress = (character: string, key: { ctrl?: boolean; name?: string }) => {
      if (key.ctrl && key.name === "c") {
        finish(new StaffInputError("Input dibatalkan."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
      } else if (character && !key.ctrl && character >= " ") {
        value += character;
      }
    };

    process.stdout.write(`${message} (input tersembunyi): `);
    input.on("keypress", onKeypress);
    input.setRawMode(true);
    input.resume();
  });
}
