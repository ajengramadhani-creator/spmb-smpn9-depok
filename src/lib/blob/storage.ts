import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { getEnv } from "@/lib/env";

function encryptionKey() {
  const encoded = getEnv().BLOB_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Kunci enkripsi dokumen belum dikonfigurasi.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("BLOB_ENCRYPTION_KEY harus berupa 32 byte dalam format Base64.");
  return key;
}

export async function uploadPrivateFile(file: File) {
  const { BLOB_READ_WRITE_TOKEN } = getEnv();
  if (!BLOB_READ_WRITE_TOKEN) throw new Error("Penyimpanan berkas belum dikonfigurasi.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(await file.arrayBuffer())), cipher.final()]);
  const blob = await put(`dokumen/${randomBytes(16).toString("hex")}.enc`, ciphertext, {
    access: "public",
    token: BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    contentType: "application/octet-stream",
  });
  return { url: blob.url, encryptionIv: iv.toString("base64"), encryptionTag: cipher.getAuthTag().toString("base64") };
}

export async function downloadPrivateFile({ url, encryptionIv, encryptionTag }: { url: string; encryptionIv: string; encryptionTag: string }) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Berkas tidak dapat diambil dari penyimpanan.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encryptionIv, "base64"));
  decipher.setAuthTag(Buffer.from(encryptionTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())), decipher.final()]);
}