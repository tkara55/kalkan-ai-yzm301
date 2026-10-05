import { NextRequest } from "next/server";
import { tokenUret, sahipligiDogrula } from "@/lib/ownership";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { url?: string; kontrolEt?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return Response.json({ hata: "Lütfen bir adres girin." }, { status: 400 });
  }

  let host: string;
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    host = parsed.host;
  } catch {
    return Response.json({ hata: "Geçersiz adres biçimi." }, { status: 400 });
  }

  const token = tokenUret(host);

  // kontrolEt true ise, doğrulamanın yapılıp yapılmadığını da kontrol et.
  if (body.kontrolEt) {
    const dogrulama = await sahipligiDogrula(url);
    return Response.json({ token, host, dogrulama });
  }

  return Response.json({ token, host });
}
