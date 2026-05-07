import { NextRequest, NextResponse } from "next/server";
import { CloudinaryError } from "../../../../../lib/cloudinary";
import {
  HomeGalleryError,
  createHomeGalleryImage,
  deleteHomeGalleryImage,
  listHomeGalleryImages,
  replaceHomeGalleryImage,
  updateHomeGalleryImage,
} from "../../../../../lib/home-gallery";
import { isAdminRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json({ images: await listHomeGalleryImages() });
  } catch (error) {
    return homeGalleryErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const alt = formData.get("alt");

    if (!(file instanceof File)) {
      throw new HomeGalleryError("missing_file", "Selecciona una imagen.");
    }

    const image = await createHomeGalleryImage(file, typeof alt === "string" ? alt : null);

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return homeGalleryErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const alt = formData.get("alt");

      if (!(file instanceof File)) {
        throw new HomeGalleryError("missing_file", "Selecciona una imagen.");
      }

      const image = await replaceHomeGalleryImage(id, file, typeof alt === "string" ? alt : null);

      return NextResponse.json({ image });
    }

    const body = (await request.json()) as { alt?: string | null; sortOrder?: number };
    const image = await updateHomeGalleryImage(id, body);

    return NextResponse.json({ image });
  } catch (error) {
    return homeGalleryErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const image = await deleteHomeGalleryImage(id);

    return NextResponse.json({ image });
  } catch (error) {
    return homeGalleryErrorResponse(error);
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "unauthorized",
      message: "Necesitas iniciar sesion.",
    },
    { status: 401 },
  );
}

function homeGalleryErrorResponse(error: unknown) {
  if (error instanceof HomeGalleryError || error instanceof CloudinaryError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
      },
      { status: error.statusCode },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      code: "internal_error",
      message: "No pudimos gestionar la galeria HOME.",
    },
    { status: 500 },
  );
}
