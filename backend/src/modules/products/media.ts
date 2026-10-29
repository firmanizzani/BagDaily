import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { setDefaultResultOrder } from "node:dns";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { AppError, badRequest } from "../../utils/errors.js";

// Prefer the working IPv4 route while retaining DNS fallback for other hosts.
setDefaultResultOrder("ipv4first");

export const localProductImageRoot = resolve(
  process.cwd(),
  "uploads",
  "product-images",
);
const cloudConfigured =
  env.SUPABASE_URL &&
  !env.SUPABASE_URL.includes("your-project") &&
  env.SUPABASE_SERVICE_ROLE_KEY &&
  env.SUPABASE_SERVICE_ROLE_KEY.length > 40;
const cloud = cloudConfigured
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)
  : undefined;

function bucketFor(path: string) {
  return path.startsWith("avatars/")
    ? env.SUPABASE_PROFILE_STORAGE_BUCKET
    : env.SUPABASE_STORAGE_BUCKET;
}

export async function saveProductImage(
  id: string,
  data: Buffer,
  extension: string,
  mime: string,
) {
  const folder = id.startsWith("avatars/") ? id : `products/${id}`;
  const path = `${folder}/${randomUUID()}.${extension}`;
  const imageUrl = `/api/media/products/${path.replace(/^products\//, "")}`;
  if (cloud) {
    const { error } = await cloud.storage
      .from(bucketFor(path))
      .upload(path, data, { contentType: mime, upsert: false });
    if (error)
      throw new AppError(
        502,
        "UPLOAD_FAILED",
        "Penyimpanan foto belum dapat dihubungi. Coba lagi.",
      );
    return {
      imagePath: path,
      imageUrl,
    };
  }
  if (env.NODE_ENV === "production")
    badRequest(
      "STORAGE_UNAVAILABLE",
      "Konfigurasikan Supabase Storage untuk upload foto pada produksi.",
    );
  await mkdir(join(localProductImageRoot, folder), { recursive: true });
  await writeFile(join(localProductImageRoot, path), data, { flag: "wx" });
  return {
    imagePath: `local/${path}`,
    imageUrl,
  };
}

export async function readProductImage(path: string) {
  if (path.startsWith("local/")) {
    const target = resolve(localProductImageRoot, path.slice(6));
    if (!target.startsWith(localProductImageRoot + "\\") && !target.startsWith(localProductImageRoot + "/")) {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Foto tidak ditemukan.");
    }
    try {
      return await readFile(target);
    } catch {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Foto tidak ditemukan.");
    }
  }
  if (!cloud) throw new AppError(503, "STORAGE_UNAVAILABLE", "Penyimpanan foto belum tersedia.");
  const { data, error } = await cloud.storage.from(bucketFor(path)).download(path);
  if (error || !data) throw new AppError(502, "IMAGE_UNAVAILABLE", "Foto belum dapat dimuat. Coba lagi.");
  return Buffer.from(await data.arrayBuffer());
}

export async function removeProductImage(path: string) {
  if (path.startsWith("local/")) {
    const target = resolve(localProductImageRoot, path.slice(6));
    if (
      !target.startsWith(localProductImageRoot + "\\") &&
      !target.startsWith(localProductImageRoot + "/")
    )
      return;
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  } else if (cloud) {
    const { error } = await cloud.storage
      .from(bucketFor(path))
      .remove([path]);
    if (error)
      throw new AppError(
        502,
        "DELETE_IMAGE_FAILED",
        "Foto belum dapat dihapus dari penyimpanan.",
      );
  }
}
