// KalkanAI — pasif, etik güvenlik tarama motoru.
// Yalnızca hedef sitenin kendi döndürdüğü yanıtı inceler: HTTP başlıkları,
// TLS/HTTPS davranışı, çerez bayrakları ve sunucu bilgi ifşası.
// Saldırı / sömürü (exploit) içermez; sadece gözlem yapar.

export type Severity = "kritik" | "yuksek" | "orta" | "dusuk" | "bilgi";

export interface Finding {
  id: string;
  baslik: string;
  severity: Severity;
  mevcut: boolean; // true: sorun tespit edildi
  detay: string;
  kanit?: string;
}

export interface ScanResult {
  url: string;
  finalUrl: string;
  httpsZorunlu: boolean;
  durumKodu: number;
  sunucu?: string;
  bulgular: Finding[];
  tarananZaman: string;
  skor: number; // 0-100, yüksek = daha güvenli
}

const SECURITY_HEADERS: {
  header: string;
  baslik: string;
  severity: Severity;
  detay: string;
}[] = [
  {
    header: "strict-transport-security",
    baslik: "HSTS (Strict-Transport-Security) eksik",
    severity: "yuksek",
    detay:
      "Tarayıcının siteye her zaman HTTPS ile bağlanmasını zorlayan başlık yok. Araya girme (MITM) ve SSL sıyırma saldırılarına açık kapı bırakır.",
  },
  {
    header: "content-security-policy",
    baslik: "Content-Security-Policy (CSP) eksik",
    severity: "yuksek",
    detay:
      "Sayfada hangi kaynakların çalışabileceğini kısıtlayan politika yok. XSS (Cross-Site Scripting) saldırılarına karşı önemli bir savunma katmanı eksik.",
  },
  {
    header: "x-frame-options",
    baslik: "X-Frame-Options eksik",
    severity: "orta",
    detay:
      "Sitenin başka bir sayfaya iframe ile gömülmesini engelleyen başlık yok. Clickjacking (tıklama hırsızlığı) riski oluşur.",
  },
  {
    header: "x-content-type-options",
    baslik: "X-Content-Type-Options eksik",
    severity: "orta",
    detay:
      "nosniff değeri yok. Tarayıcı dosya türünü tahmin ederek beklenmeyen içerikleri çalıştırabilir.",
  },
  {
    header: "referrer-policy",
    baslik: "Referrer-Policy eksik",
    severity: "dusuk",
    detay:
      "Başka sitelere geçişte hangi adres bilgisinin sızdırılacağı kontrol edilmiyor. Kullanıcı gizliliği açısından zayıflık.",
  },
  {
    header: "permissions-policy",
    baslik: "Permissions-Policy eksik",
    severity: "dusuk",
    detay:
      "Kamera, mikrofon, konum gibi tarayıcı yeteneklerine erişim kısıtlanmamış.",
  },
];

const SEVERITY_WEIGHT: Record<Severity, number> = {
  kritik: 30,
  yuksek: 18,
  orta: 10,
  dusuk: 4,
  bilgi: 0,
};

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return "https://" + trimmed;
  }
  return trimmed;
}

export async function scanSite(rawUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(rawUrl);
  const parsed = new URL(url);

  const bulgular: Finding[] = [];
  const tarananZaman = new Date().toISOString();

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "KalkanAI-Tarayici/1.0 (+etik-guvenlik-taramasi)",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }

  const headers = response.headers;
  const finalUrl = response.url || url;
  const httpsZorunlu =
    finalUrl.startsWith("https://") || parsed.protocol === "https:";

  // 1) HTTPS kontrolü
  if (!finalUrl.startsWith("https://")) {
    bulgular.push({
      id: "https",
      baslik: "Site HTTPS kullanmıyor",
      severity: "kritik",
      mevcut: true,
      detay:
        "Trafik şifrelenmeden taşınıyor. Kullanıcıların girdiği her bilgi (parola, kişisel veri) ağ üzerinden okunabilir.",
      kanit: finalUrl,
    });
  } else {
    bulgular.push({
      id: "https",
      baslik: "HTTPS etkin",
      severity: "bilgi",
      mevcut: false,
      detay: "Bağlantı şifreli taşınıyor. Olumlu.",
      kanit: finalUrl,
    });
  }

  // 2) Güvenlik başlıkları
  for (const h of SECURITY_HEADERS) {
    const value = headers.get(h.header);
    bulgular.push({
      id: h.header,
      baslik: value ? `${h.baslik.replace(" eksik", "")} mevcut` : h.baslik,
      severity: value ? "bilgi" : h.severity,
      mevcut: !value,
      detay: value ? "Başlık yapılandırılmış. Olumlu." : h.detay,
      kanit: value ? `${h.header}: ${value}`.slice(0, 180) : undefined,
    });
  }

  // 3) Sunucu bilgi ifşası
  const server = headers.get("server") || undefined;
  const poweredBy = headers.get("x-powered-by");
  if (poweredBy || (server && /\d/.test(server))) {
    bulgular.push({
      id: "info-disclosure",
      baslik: "Sunucu sürüm bilgisi ifşa ediliyor",
      severity: "dusuk",
      mevcut: true,
      detay:
        "Sunucu veya çatı (framework) sürümü başlıklarda görünüyor. Saldırganlar bu sürüme ait bilinen açıkları hedefleyebilir.",
      kanit: [poweredBy && `X-Powered-By: ${poweredBy}`, server && `Server: ${server}`]
        .filter(Boolean)
        .join(" | "),
    });
  }

  // 4) Çerez güvenlik bayrakları
  const setCookie = headers.get("set-cookie");
  if (setCookie) {
    const eksikBayraklar: string[] = [];
    if (!/httponly/i.test(setCookie)) eksikBayraklar.push("HttpOnly");
    if (!/secure/i.test(setCookie)) eksikBayraklar.push("Secure");
    if (!/samesite/i.test(setCookie)) eksikBayraklar.push("SameSite");
    if (eksikBayraklar.length > 0) {
      bulgular.push({
        id: "cookie-flags",
        baslik: "Çerezlerde güvenlik bayrakları eksik",
        severity: "orta",
        mevcut: true,
        detay: `Oturum çerezleri şu bayraklar olmadan gönderiliyor: ${eksikBayraklar.join(
          ", "
        )}. Oturum çalınması (session hijacking) riskini artırır.`,
        kanit: `Eksik: ${eksikBayraklar.join(", ")}`,
      });
    }
  }

  // Skor hesabı
  let kayip = 0;
  for (const b of bulgular) {
    if (b.mevcut) kayip += SEVERITY_WEIGHT[b.severity];
  }
  const skor = Math.max(0, Math.min(100, 100 - kayip));

  return {
    url,
    finalUrl,
    httpsZorunlu,
    durumKodu: response.status,
    sunucu: server,
    bulgular,
    tarananZaman,
    skor,
  };
}
