import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { CloudinaryError, uploadMenuImage } from "../../../../../lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      {
        code: "unauthorized",
        message: "Necesitas iniciar sesion.",
      },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new CloudinaryError("missing_file", "Selecciona una imagen para subir.");
    }

    const image = await uploadMenuImage(file);

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    if (error instanceof CloudinaryError) {
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
        message: "No pudimos subir la imagen.",
      },
      { status: 500 },
    );
  }
}
