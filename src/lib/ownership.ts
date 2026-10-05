// Sahiplik doğrulaması — etik tarama için kritik.
// Kullanıcının bir siteyi taratabilmesi için o sitenin sahibi olduğunu
// kanıtlaması gerekir: sitenin ana sayfasına benzersiz bir doğrulama
// etiketi (meta tag) yerleştirmesi beklenir.

import crypto from "crypto";

// Oturum/kullanıcı başına sabit bir gizli anahtar üzerinden token üretilir.
const SECRET = process.env.KALKAN_VERIFY_SECRET || "kalkan-ai-yerel-gizli-anahtar";

export function tokenUret(domain: string): string {
  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, "");
  const host = normalized.split("/")[0];
  const hmac = crypto.createHmac("sha256", SECRET).update(host).digest("hex");
  return "kalkan-" + hmac.slice(0, 24);
}

export interface VerifyResult {
  dogrulandi: boolean;
  yontem?: "meta" | "well-known";
  mesaj: string;
}

export async function sahipligiDogrula(
  rawUrl: string
): Promise<VerifyResult> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl;
  const parsed = new URL(url);
  const beklenenToken = tokenUret(parsed.host);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    // 1) Ana sayfada meta etiketi ara
    const anaSayfa = await fetch(parsed.origin, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "KalkanAI-Dogrulama/1.0" },
    });
    const html = await anaSayfa.text();
    const metaRegex = new RegExp(
      `<meta[^>]+name=["']kalkan-verify["'][^>]+content=["']${beklenenToken}["']`,
      "i"
    );
    const metaRegexTers = new RegExp(
      `<meta[^>]+content=["']${beklenenToken}["'][^>]+name=["']kalkan-verify["']`,
      "i"
    );
    if (metaRegex.test(html) || metaRegexTers.test(html)) {
      return {
        dogrulandi: true,
        yontem: "meta",
        mesaj: "Meta etiketi bulundu. Sahiplik doğrulandı.",
      };
    }

    // 2) .well-known dosyası ara
    try {
      const wk = await fetch(`${parsed.origin}/.well-known/kalkan-verify.txt`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (wk.ok) {
        const icerik = (await wk.text()).trim();
        if (icerik === beklenenToken) {
          return {
            dogrulandi: true,
            yontem: "well-known",
            mesaj: "Doğrulama dosyası bulundu. Sahiplik doğrulandı.",
          };
        }
      }
    } catch {
      // .well-known yoksa sorun değil
    }

    return {
      dogrulandi: false,
      mesaj:
        "Doğrulama etiketi bulunamadı. Lütfen sitenizin ana sayfasına doğrulama etiketini ekleyip tekrar deneyin.",
    };
  } catch {
    return {
      dogrulandi: false,
      mesaj:
        "Site doğrulama için getirilemedi. Adresi kontrol edin ve sitenin erişilebilir olduğundan emin olun.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
