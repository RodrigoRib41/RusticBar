import { createHash } from "crypto";

const MENU_IMAGE_FOLDER = "rustic-pub/menu";
const HOME_IMAGE_FOLDER = "rustic-pub/home";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  error?: {
    message?: string;
  };
};

type CloudinaryDestroyResponse = {
  result?: string;
  error?: {
    message?: string;
  };
};

export type UploadedMenuImage = {
  imagePublicId: string;
  imageUrl: string;
};

export class CloudinaryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "CloudinaryError";
  }
}

export async function uploadMenuImage(file: File): Promise<UploadedMenuImage> {
  return uploadCloudinaryImage(file, MENU_IMAGE_FOLDER);
}

export async function uploadHomeImage(file: File): Promise<UploadedMenuImage> {
  return uploadCloudinaryImage(file, HOME_IMAGE_FOLDER);
}

async function uploadCloudinaryImage(file: File, folder: string): Promise<UploadedMenuImage> {
  validateMenuImage(file);

  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    folder,
    timestamp,
  };
  const body = new FormData();
  const buffer = await file.arrayBuffer();

  body.append("file", new Blob([buffer], { type: file.type }), sanitizeFilename(file.name));
  body.append("api_key", config.apiKey);
  body.append("folder", params.folder);
  body.append("timestamp", params.timestamp);
  body.append("signature", signCloudinaryParams(params, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    body,
    method: "POST",
  });
  const data = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || data.error || !data.secure_url || !data.public_id) {
    throw new CloudinaryError(
      "upload_failed",
      data.error?.message ?? "No pudimos subir la imagen a Cloudinary.",
      response.status || 502,
    );
  }

  return {
    imagePublicId: data.public_id,
    imageUrl: optimizeCloudinaryUrl(data.secure_url),
  };
}

export async function deleteMenuImage(publicId: string) {
  const cleanPublicId = publicId.trim();

  if (!cleanPublicId) {
    return;
  }

  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    invalidate: "true",
    public_id: cleanPublicId,
    timestamp,
  };
  const body = new FormData();

  body.append("api_key", config.apiKey);
  body.append("invalidate", params.invalidate);
  body.append("public_id", params.public_id);
  body.append("timestamp", params.timestamp);
  body.append("signature", signCloudinaryParams(params, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    body,
    method: "POST",
  });
  const data = (await response.json()) as CloudinaryDestroyResponse;

  if (!response.ok || data.error) {
    throw new CloudinaryError(
      "delete_failed",
      data.error?.message ?? "No pudimos eliminar la imagen de Cloudinary.",
      response.status || 502,
    );
  }
}

function validateMenuImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new CloudinaryError("invalid_format", "Usa una imagen JPG, PNG, WebP o AVIF.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new CloudinaryError("too_large", "La imagen no puede superar los 5 MB.");
  }
}

function getCloudinaryConfig(): { apiKey: string; apiSecret: string; cloudName: string } {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const missing = [
    ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", cloudName],
    ["CLOUDINARY_API_KEY", apiKey],
    ["CLOUDINARY_API_SECRET", apiSecret],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new CloudinaryError(
      "missing_config",
      `Faltan variables de Cloudinary en .env.local: ${missing.join(", ")}.`,
      503,
    );
  }

  return { apiKey: apiKey as string, apiSecret: apiSecret as string, cloudName: cloudName as string };
}

function optimizeCloudinaryUrl(url: string) {
  if (!url.includes("/upload/")) {
    return url;
  }

  return url.replace("/upload/", "/upload/f_auto/q_auto/");
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "menu-image";
}
