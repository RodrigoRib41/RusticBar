"use client";

import { useMemo, useState } from "react";

type QrDownloadPrintProps = {
  fileName: string;
  label: string;
  showImage?: boolean;
  url: string;
};

export function QrDownloadPrint({ fileName, label, showImage = true, url }: QrDownloadPrintProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const qrUrl = useMemo(() => buildQrUrl(url), [url]);

  async function downloadQr() {
    setIsDownloading(true);

    try {
      const response = await fetch(qrUrl);

      if (!response.ok) {
        throw new Error("No pudimos descargar el QR.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${sanitizeFileName(fileName)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(qrUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  }

  function printQr() {
    const printWindow = window.open("", "_blank", "width=520,height=720");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(label)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              padding: 28px;
              color: #17120d;
              font-family: Arial, Helvetica, sans-serif;
              background: #fff;
            }
            main {
              width: min(420px, 100%);
              text-align: center;
              border: 2px solid #17120d;
              border-radius: 24px;
              padding: 24px;
            }
            .brand {
              margin: 0;
              font-size: 14px;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
            }
            h1 {
              margin: 8px 0 20px;
              font-size: 34px;
              line-height: .95;
              text-transform: uppercase;
            }
            img {
              width: 300px;
              max-width: 100%;
              height: auto;
            }
            p.url {
              margin: 18px 0 0;
              overflow-wrap: anywhere;
              font-size: 12px;
              line-height: 1.45;
            }
            @media print {
              body { padding: 0; }
              main { border-color: #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <main>
            <p class="brand">Rustic Pub</p>
            <h1>${escapeHtml(label)}</h1>
            <img src="${qrUrl}" alt="${escapeHtml(label)}" />
            <p class="url">${escapeHtml(url)}</p>
          </main>
          <script>
            window.addEventListener("load", () => {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="grid gap-3">
      {showImage ? (
        <div className="rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-auto w-full" src={qrUrl} alt={label} loading="lazy" />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="min-h-11 rounded-xl border border-amber-200/20 px-3 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-wait disabled:opacity-60"
          disabled={isDownloading}
          onClick={downloadQr}
          type="button"
        >
          {isDownloading ? "Descargando..." : "Descargar"}
        </button>
        <button
          className="min-h-11 rounded-xl bg-amber-300 px-3 text-xs font-black uppercase text-[#140b04] transition hover:bg-amber-200"
          onClick={printQr}
          type="button"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

export function buildQrUrl(url: string, size = 320) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "qr-rustic-pub";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
