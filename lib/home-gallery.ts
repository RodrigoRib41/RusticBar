import { Prisma } from "@prisma/client";
import { deleteMenuImage, uploadHomeImage } from "./cloudinary";
import { prisma } from "./prisma";

export const MAX_HOME_GALLERY_IMAGES = 10;

export type HomeGalleryImageView = {
  alt: string | null;
  createdAt: string;
  id: string;
  imagePublicId: string;
  imageUrl: string;
  sortOrder: number;
};

export class HomeGalleryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "HomeGalleryError";
  }
}

export async function listHomeGalleryImages() {
  const images = await prisma.homeGalleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return images.map(serializeHomeGalleryImage);
}

export async function createHomeGalleryImage(file: File, alt?: string | null) {
  const count = await prisma.homeGalleryImage.count();

  if (count >= MAX_HOME_GALLERY_IMAGES) {
    throw new HomeGalleryError("gallery_limit", "La galería HOME permite hasta 10 fotos.", 409);
  }

  const uploaded = await uploadHomeImage(file);
  const image = await prisma.homeGalleryImage.create({
    data: {
      alt: sanitizeText(alt ?? "", 120) || null,
      imagePublicId: uploaded.imagePublicId,
      imageUrl: uploaded.imageUrl,
      sortOrder: count,
    },
  });

  return serializeHomeGalleryImage(image);
}

export async function replaceHomeGalleryImage(id: string, file: File, alt?: string | null) {
  const current = await prisma.homeGalleryImage.findUnique({ where: { id } });

  if (!current) {
    throw new HomeGalleryError("not_found", "No encontramos esa foto.", 404);
  }

  const uploaded = await uploadHomeImage(file);
  const image = await prisma.homeGalleryImage.update({
    data: {
      alt: sanitizeText(alt ?? current.alt ?? "", 120) || null,
      imagePublicId: uploaded.imagePublicId,
      imageUrl: uploaded.imageUrl,
    },
    where: { id },
  });

  try {
    await deleteMenuImage(current.imagePublicId);
  } catch (error) {
    console.warn("Could not delete replaced HOME image", error);
  }

  return serializeHomeGalleryImage(image);
}

export async function updateHomeGalleryImage(id: string, input: { alt?: string | null; sortOrder?: number }) {
  try {
    const image = await prisma.homeGalleryImage.update({
      data: {
        ...(typeof input.alt === "string" ? { alt: sanitizeText(input.alt, 120) || null } : {}),
        ...(Number.isInteger(input.sortOrder) ? { sortOrder: input.sortOrder as number } : {}),
      },
      where: { id },
    });

    return serializeHomeGalleryImage(image);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new HomeGalleryError("not_found", "No encontramos esa foto.", 404);
    }

    throw error;
  }
}

export async function deleteHomeGalleryImage(id: string) {
  try {
    const image = await prisma.homeGalleryImage.delete({ where: { id } });

    try {
      await deleteMenuImage(image.imagePublicId);
    } catch (error) {
      console.warn("Could not delete HOME image from Cloudinary", error);
    }

    return serializeHomeGalleryImage(image);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new HomeGalleryError("not_found", "No encontramos esa foto.", 404);
    }

    throw error;
  }
}

function serializeHomeGalleryImage(image: {
  alt: string | null;
  createdAt: Date;
  id: string;
  imagePublicId: string;
  imageUrl: string;
  sortOrder: number;
}): HomeGalleryImageView {
  return {
    alt: image.alt,
    createdAt: image.createdAt.toISOString(),
    id: image.id,
    imagePublicId: image.imagePublicId,
    imageUrl: image.imageUrl,
    sortOrder: image.sortOrder,
  };
}

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
