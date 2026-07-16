import { del, put } from "@vercel/blob";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export function assertBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
}

export async function uploadToBlob(file: File, folder: string) {
  assertBlobConfigured();

  if (file.size > MAX_BYTES) {
    throw new Error("File must be 15 MB or smaller");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `${folder}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    url: blob.url,
    storageKey: blob.pathname,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    name: file.name,
  };
}

export async function deleteFromBlob(storageKey: string) {
  assertBlobConfigured();
  await del(storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
