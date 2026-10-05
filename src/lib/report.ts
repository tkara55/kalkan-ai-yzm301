// Claude ile KVKK odaklı Türkçe güvenlik raporu üretimi.
// Tarama bulguları modele verilir; model bunları işletme sahibinin
// anlayacağı dilde, KVKK yükümlülükleri bağlamında yorumlar.

import Anthropic from "@anthropic-ai/sdk";
import type { ScanResult } from "./scanner";

export interface AiRapor {
  ozet: string;
  kvkkDegerlendirme: string;
  oncelikliAdimlar: string[];
  model: string;
}

const SYSTEM_PROMPT = `Sen "KalkanAI" adlı bir siber güvenlik asistanısın. Türkiye'deki KOBİ ve esnafın web sitelerinin güvenlik taramalarını, teknik bilgisi olmayan işletme sahiplerinin anlayacağı sade bir Türkçe ile yorumlarsın.

Görevin, sana verilen pasif güvenlik tarama bulgularını değerlendirip:
1. Durumu özetlemek (işletme sahibine hitap eden, panik yaratmayan ama ciddiyeti aktaran bir dille).
2. Bulguları KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) açısından değerlendirmek. Özellikle KVKK md. 12 (veri güvenliğine ilişkin yükümlülükler) ve uygun teknik tedbir alma zorunluluğuna atıf yap. Hukuki tavsiye verdiğini değil, farkındalık oluşturduğunu belirt.
3. Öncelik sırasına göre somut, uygulanabilir adımlar önermek.

Kurallar:
- Yalnızca sana verilen bulgulara dayan. Tarama verisinde olmayan açıklar uydurma.
- Abartma; her eksikliği "veri ihlali olacak" diye sunma. Risk seviyesini bulgunun ciddiyetiyle orantılı anlat.
- Teknik terimleri kullandığında parantez içinde kısa açıklama ekle.
- Çıktıyı SADECE geçerli JSON olarak ver, başka metin ekleme.`;

export async function raporUret(scan: ScanResult): Promise<AiRapor> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const bulguOzeti = scan.bulgular
    .filter((b) => b.mevcut)
    .map((b) => `- [${b.severity.toUpperCase()}] ${b.baslik}: ${b.detay}`)
    .join("\n");

  const olumlu = scan.bulgular
    .filter((b) => !b.mevcut && b.severity === "bilgi")
    .map((b) => `- ${b.baslik}`)
    .join("\n");

  // API anahtarı yoksa, demo amaçlı kural tabanlı rapora düş.
  if (!apiKey) {
    return yedekRapor(scan, bulguOzeti);
  }

  const client = new Anthropic({ apiKey });

  const kullaniciMesaji = `Taranan site: ${scan.finalUrl}
Güvenlik skoru: ${scan.skor}/100
Tarama zamanı: ${scan.tarananZaman}

TESPİT EDİLEN EKSİKLİKLER:
${bulguOzeti || "Belirgin bir eksiklik tespit edilmedi."}

OLUMLU BULUNAN NOKTALAR:
${olumlu || "Yok."}

Bu bulguları yukarıdaki kurallara göre değerlendir ve şu JSON şemasında yanıt ver:
{
  "ozet": "2-3 cümlelik genel durum özeti",
  "kvkkDegerlendirme": "KVKK açısından 1 paragraf değerlendirme",
  "oncelikliAdimlar": ["adım 1", "adım 2", "adım 3", ...]
}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: kullaniciMesaji }],
    });

    const metin = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const json = jsonAyikla(metin);
    return {
      ozet: typeof json.ozet === "string" ? json.ozet : "",
      kvkkDegerlendirme:
        typeof json.kvkkDegerlendirme === "string"
          ? json.kvkkDegerlendirme
          : "",
      oncelikliAdimlar: Array.isArray(json.oncelikliAdimlar)
        ? (json.oncelikliAdimlar as string[])
        : [],
      model: response.model,
    };
  } catch {
    return yedekRapor(scan, bulguOzeti);
  }
}

function jsonAyikla(metin: string): Record<string, unknown> {
  // Model bazen ```json ... ``` bloğu içinde döndürebilir.
  const temiz = metin
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(temiz);
  } catch {
    const ilk = temiz.indexOf("{");
    const son = temiz.lastIndexOf("}");
    if (ilk !== -1 && son !== -1) {
      try {
        return JSON.parse(temiz.slice(ilk, son + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

// API anahtarı olmadan da uygulamanın çalışabilmesi için kural tabanlı yedek.
function yedekRapor(scan: ScanResult, bulguOzeti: string): AiRapor {
  const kritikVar = scan.bulgular.some((b) => b.mevcut && b.severity === "kritik");
  const yuksekVar = scan.bulgular.some((b) => b.mevcut && b.severity === "yuksek");

  let ozet: string;
  if (kritikVar) {
    ozet = `Sitenizde acil müdahale gerektiren kritik güvenlik eksiklikleri tespit edildi. Güvenlik skorunuz ${scan.skor}/100. Kullanıcı verileri risk altında olabilir.`;
  } else if (yuksekVar) {
    ozet = `Sitenizde önemli güvenlik başlıkları eksik. Güvenlik skorunuz ${scan.skor}/100. Kısa vadede giderilmesi önerilir.`;
  } else {
    ozet = `Sitenizin temel güvenlik yapılandırması makul düzeyde. Güvenlik skorunuz ${scan.skor}/100. Yine de iyileştirme alanları mevcut.`;
  }

  return {
    ozet,
    kvkkDegerlendirme:
      "KVKK (6698 sayılı Kanun) md. 12, kişisel veri işleyen her işletmeye 'uygun güvenlik düzeyini sağlamaya yönelik gerekli teknik tedbirleri alma' yükümlülüğü getirir. Yukarıdaki eksiklikler, ziyaretçi ve müşterilerinize ait kişisel verilerin yetkisiz erişime açık kalmasına yol açabileceğinden bu yükümlülük kapsamında değerlendirilmelidir. Bu değerlendirme bir hukuki görüş değil, farkındalık amaçlı bir özetidir.",
    oncelikliAdimlar: scan.bulgular
      .filter((b) => b.mevcut && b.severity !== "bilgi")
      .sort((a, b) => siraDegeri(b.severity) - siraDegeri(a.severity))
      .slice(0, 6)
      .map((b) => `${b.baslik} — ${b.detay}`),
    model: "yedek-kural-tabanli (ANTHROPIC_API_KEY tanımlı değil)",
  };
}

function siraDegeri(s: string): number {
  return { kritik: 5, yuksek: 4, orta: 3, dusuk: 2, bilgi: 1 }[s] ?? 0;
}
