const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP?.replace(/\D/g, "") || "5493498438728";
const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/rustic.pubgc/";

const whatsappMessage = encodeURIComponent("Hola Rustic Pub, quiero hacer una consulta.");
const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

export function SiteFooter() {
  return (
    <footer className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-amber-200/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-black uppercase text-amber-100">Rustic Pub</p>
          <p className="mt-1 text-sm text-amber-50/55">&copy; 2026 Rustic Pub. Todos los derechos reservados.</p>
          <p className="mt-1 text-sm text-amber-50/55"> Sitio desarrollado por Rodrigo Riboldi.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
            href={whatsappHref}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
          </a>
          <a
            className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
            href={INSTAGRAM_URL}
            rel="noreferrer"
            target="_blank"
          >
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
