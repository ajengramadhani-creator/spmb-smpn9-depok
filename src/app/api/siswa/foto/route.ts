import sharp from "sharp";
import { Role } from "@prisma/client";
import { createPrivateFileUrl, createStorageKey, deletePrivateFile, privateFileRedirect, uploadPrivateFile } from "@/lib/storage";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 2 * 1024 * 1024 + 128 * 1024) {
    return Response.json({ pesan: "Ukuran foto harus maksimal 2 MB." }, { status: 413 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 2 * 1024 * 1024) {
    return Response.json({ pesan: "Pilih foto berukuran maksimal 2 MB." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if ((!jpeg && !png) || (jpeg && file.type !== "image/jpeg") || (png && file.type !== "image/png")) {
    return Response.json({ pesan: "Foto harus berupa JPEG atau PNG yang valid." }, { status: 400 });
  }
  const processor = sharp(bytes, { limitInputPixels: 40_000_000 }).rotate();
  const metadata = await processor.metadata();
  if (!metadata.width || !metadata.height || metadata.width > 8000 || metadata.height > 8000) {
    return Response.json({ pesan: "Dimensi foto terlalu besar." }, { status: 400 });
  }
  const image = await processor.resize(512, 512, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const key = createStorageKey(`profil/${user.id}`, "jpg");
  await uploadPrivateFile(key, image, "image/jpeg");
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { image: true } });
  try {
    await prisma.user.update({ where: { id: user.id }, data: { image: key } });
  } catch (error) {
    await deletePrivateFile(key);
    throw error;
  }
  if (previous.image?.startsWith(`profil/${user.id}/`)) await deletePrivateFile(previous.image);
  return Response.json({ url: await createPrivateFileUrl(key) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { image: true } });
  if (!account.image?.startsWith(`profil/${user.id}/`)) return Response.json({ pesan: "Foto profil belum tersedia." }, { status: 404 });
  return privateFileRedirect(account.image);
}
