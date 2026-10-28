import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { AppError, badRequest } from "../../utils/errors.js";

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

export async function saveProductImage(
  id: string,
  data: Buffer,
  extension: string,
  mime: string,
) {
  const path = `${id}/${randomUUID()}.${extension}`;
  if (cloud) {
    const { error } = await cloud.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, data, { contentType: mime, upsert: false });
    if (error)
      throw new AppError(
        502,
        "UPLOAD_FAILED",
        "Penyimpanan foto belum dapat dihubungi. Coba lagi.",
      );
    return {
      imagePath: path,
      imageUrl: cloud.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(path).data.publicUrl,
    };
  }
  if (env.NODE_ENV === "production")
    badRequest(
      "STORAGE_UNAVAILABLE",
      "Konfigurasikan Supabase Storage untuk upload foto pada produksi.",
    );
  await mkdir(join(localProductImageRoot, id), { recursive: true });
  await writeFile(join(localProductImageRoot, path), data, { flag: "wx" });
  return {
    imagePath: `local/${path}`,
    imageUrl: `/api/media/products/${path}`,
  };
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
      .from(env.SUPABASE_STORAGE_BUCKET)
      .remove([path]);
    if (error)
      throw new AppError(
        502,
        "DELETE_IMAGE_FAILED",
        "Foto belum dapat dihapus dari penyimpanan.",
      );
  }
}
