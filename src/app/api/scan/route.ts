import { NextRequest } from "next/server";
import { scanSite } from "@/lib/scanner";
import { raporUret } from "@/lib/report";
import { sahipligiDogrula, tokenUret } from "@/lib/ownership";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return Response.json({ hata: "Lütfen bir adres girin." }, { status: 400 });
  }

  // Adres biçim kontrolü
  let host: string;
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    host = parsed.host;
  } catch {
    return Response.json({ hata: "Geçersiz adres biçimi." }, { status: 400 });
  }

  // 1) Sahiplik doğrulaması — etik tarama zorunluluğu.
  const dogrulama = await sahipligiDogrula(url);
  if (!dogrulama.dogrulandi) {
    return Response.json(
      {
        hata: "dogrulama_gerekli",
        mesaj: dogrulama.mesaj,
        token: tokenUret(host),
        host,
      },
      { status: 403 }
    );
  }

  // 2) Pasif tarama
  let scan;
  try {
    scan = await scanSite(url);
  } catch {
    return Response.json(
      { hata: "Site taranamadı. Adresi ve erişilebilirliğini kontrol edin." },
      { status: 502 }
    );
  }

  // 3) Claude ile rapor
  const rapor = await raporUret(scan);

  return Response.json({ scan, rapor, dogrulama });
}
