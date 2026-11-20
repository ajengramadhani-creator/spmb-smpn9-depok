import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";

const bucket = "uploads";
let client: S3Client | undefined;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Penyimpanan berkas belum dikonfigurasi.");
    this.name = "StorageNotConfiguredError";
  }
}

export function storageConfigurationErrorResponse(error: unknown) {
  if (!(error instanceof StorageNotConfiguredError)) throw error;
  return Response.json({ pesan: error.message }, { status: 503 });
}

function storageClient() {
  const { AWS_ENDPOINT, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = getEnv();
  if (!AWS_ENDPOINT || !AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new StorageNotConfiguredError();
  }
  client ??= new S3Client({
    endpoint: AWS_ENDPOINT,
    region: AWS_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  });
  return client;
}

export function createStorageKey(prefix: string, extension: string) {
  return `${prefix}/${randomBytes(20).toString("hex")}.${extension}`;
}

export async function uploadPrivateFile(key: string, body: Buffer, contentType: string) {
  await storageClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function deletePrivateFile(key: string) {
  await storageClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createPrivateFileUrl(key: string, expiresIn = 300) {
  return getSignedUrl(storageClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function privateFileRedirect(key: string) {
  try {
    const response = Response.redirect(await createPrivateFileUrl(key), 307);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    return storageConfigurationErrorResponse(error);
  }
}
