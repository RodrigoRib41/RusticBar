import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/reserva", "/mesa"],
      disallow: ["/menu-qr", "/qr", "/comidas", "/bebidas", "/postres"],
    },
  };
}
