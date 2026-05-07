import { ReservationError } from "./reservations";

type RecaptchaResponse = {
  "error-codes"?: string[];
  success?: boolean;
};

export async function verifyRecaptchaToken(token: string, remoteIp?: string) {
  const cleanToken = token.trim();

  if (!cleanToken) {
    throw new ReservationError("recaptcha_required", "Completa el reCAPTCHA para confirmar la reserva.");
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    throw new ReservationError("recaptcha_not_configured", "Falta configurar reCAPTCHA en el servidor.", 500);
  }

  const body = new URLSearchParams({
    response: cleanToken,
    secret,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const data = (await response.json().catch(() => ({}))) as RecaptchaResponse;

  if (!response.ok || !data.success) {
    throw new ReservationError("recaptcha_failed", "No pudimos validar el reCAPTCHA. Intentalo de nuevo.");
  }
}
