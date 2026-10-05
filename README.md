# 🛡️ KalkanAI — Yapay Zekâ Destekli Etik Güvenlik Taraması

> **Yazılım Gerçekleme ve Test** dersi — Ödev 3: *Yeni Deprem Üretmek*
> XBOW (yapay zekâ pentest ajanı) esinli, Türkiye'ye yerelleştirilmiş klon.

---

## 1. Belirlenen "Deprem": AI Pentest Ajanları (XBOW)

2025 yılında **XBOW** adlı yapay zekâ ajanı, HackerOne'ın ABD bug bounty
liderlik tablosunda **1. sıraya** çıkarak insan güvenlik araştırmacılarını
geçti. Bu olay siber güvenlik dünyasında "deprem" etkisi yarattı: güvenlik
testlerinin (penetration testing) otomatikleştirilebileceği ve yapay zekânın
zafiyet tespitinde insan seviyesine ulaştığı somut biçimde kanıtlandı.
Y Combinator'ın RFS (Request for Startups) listelerinde ve Hacker News
tartışmalarında "AI for security / autonomous pentesting" başlığı bu dönemde
en çok konuşulan tema oldu.

**Neden bir deprem?**
- Güvenlik denetimi, pahalı ve kıt bir uzmanlık alanıydı; AI bunu
  ölçeklenebilir hale getiriyor.
- KOBİ'ler ve esnaf, bütçe yetersizliği yüzünden hiç güvenlik denetimi
  yaptıramıyordu. AI ajanları bu eşiği düşürüyor.

## 2. Ürün: KalkanAI (Yerelleştirilmiş Klon + İnovasyon)

KalkanAI, XBOW'un temel fikrini — **yapay zekâ ile otomatik güvenlik
değerlendirmesi** — alıp Türkiye pazarına uyarlar:

| Boyut | XBOW (orijinal) | KalkanAI (bu proje) |
|-------|-----------------|---------------------|
| Hedef kitle | Büyük şirketler, bug bounty | Türk KOBİ ve esnafı |
| Dil | İngilizce, teknik | Sade Türkçe, işletme sahibine yönelik |
| Hukuki çerçeve | Genel | **KVKK (6698) md. 12** uyum odaklı rapor |
| Etik model | Yetkili pentest | **Zorunlu sahiplik doğrulaması** + pasif tarama |
| Çıktı | Teknik bulgu | AI yorumu + öncelikli eylem planı |

### Yenilikçi / yerel katkılar (100+ puan hedefi)

1. **KVKK odaklı yorumlama.** Teknik bulgular, Claude tarafından 6698 sayılı
   Kanun'un veri güvenliği yükümlülükleri bağlamında Türkçe değerlendirilir.
2. **Etik-öncelikli tasarım (ethical-by-design).** Bir site, ancak sahipliği
   **doğrulandıktan** sonra taranabilir (meta etiketi veya `.well-known`
   dosyası ile). Bu, aracın kötüye kullanımını engeller — orijinal pentest
   araçlarında çoğunlukla bulunmayan bir güvence.
3. **Pasif tarama.** Hiçbir saldırı/sömürü denemesi yapılmaz; yalnızca hedefin
   kendi döndürdüğü yanıt (HTTP başlıkları, TLS, çerez bayrakları) incelenir.
4. **Anahtarsız çalışma.** `ANTHROPIC_API_KEY` yoksa kural tabanlı yedek rapor
   devreye girer; demo her koşulda çalışır.

## 3. Mimari

```
Kullanıcı (Tarayıcı)
      │  URL gir → "Taramayı Başlat"
      ▼
Next.js App Router (React, Tailwind)
      │
      ├─ POST /api/verify  → Sahiplik doğrulama token'ı üretir
      │
      └─ POST /api/scan
            │
            ├─ 1) ownership.ts → sahiplik doğrula (meta / .well-known)
            │        reddedilirse 403 + doğrulama talimatı
            │
            ├─ 2) scanner.ts   → pasif güvenlik taraması
            │        (HTTPS, HSTS, CSP, X-Frame-Options, çerez bayrakları,
            │         bilgi ifşası) + 0-100 güvenlik skoru
            │
            └─ 3) report.ts    → Claude API (claude-opus-4-8)
                     bulguları KVKK bağlamında Türkçe rapora çevirir
```

### Dosya yapısı

```
src/
├─ app/
│  ├─ page.tsx           # Arayüz (tek sayfa dashboard)
│  ├─ layout.tsx         # Kök düzen + demo doğrulama etiketi
│  ├─ globals.css        # Koyu tema
│  └─ api/
│     ├─ scan/route.ts   # Doğrula → tara → raporla
│     └─ verify/route.ts # Doğrulama token'ı
└─ lib/
   ├─ scanner.ts         # Pasif güvenlik kontrolleri
   ├─ ownership.ts       # Sahiplik doğrulaması (HMAC token)
   └─ report.ts          # Claude ile KVKK raporu (+ yedek)
```

## 4. Kurulum ve Çalıştırma

Gereksinim: **Node.js 18+**

```bash
# 1. Bağımlılıkları kur
npm install

# 2. (İsteğe bağlı) API anahtarını tanımla
cp .env.example .env.local
# .env.local içine ANTHROPIC_API_KEY=... yazın

# 3. Geliştirme sunucusunu başlat
npm run dev
# http://localhost:3000 adresini açın
```

> API anahtarı eklemeseniz bile uygulama çalışır — kural tabanlı yedek rapor
> üretilir. Anahtar eklenince raporlar Claude tarafından zenginleştirilir.

## 5. Nasıl Kullanılır (Demo Senaryosu)

1. Taratmak istediğiniz sitenin adresini girin.
2. Site sahibi değilseniz: sistem bir **doğrulama etiketi** verir. Bu etiketi
   sitenizin ana sayfasına ekleyemediğiniz sürece tarama yapılmaz (etik kapı).
3. Doğrulama sonrası: güvenlik skoru, AI değerlendirmesi, KVKK yorumu ve
   öncelikli eylem adımları ekranda listelenir.

**Hızlı demo:** Proje, kendi yerel adresi (`http://localhost:3000`) için
doğrulama etiketini `layout.tsx` içinde taşır; bu adresi girerek tam akışı
anında görebilirsiniz.

## 6. Tespit Edilen Kontroller

- HTTPS zorunluluğu (kritik)
- HSTS / Strict-Transport-Security (yüksek)
- Content-Security-Policy (yüksek)
- X-Frame-Options — clickjacking (orta)
- X-Content-Type-Options — nosniff (orta)
- Referrer-Policy (düşük)
- Permissions-Policy (düşük)
- Çerez güvenlik bayrakları: HttpOnly / Secure / SameSite (orta)
- Sunucu / framework sürüm ifşası (düşük)

## 7. Teknoloji

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** — koyu tema arayüz
- **@anthropic-ai/sdk** — Claude (`claude-opus-4-8`)
- **Zod** — veri doğrulama

## 8. Yasal Uyarı

KalkanAI yalnızca **eğitim** ve **yetkili güvenlik testi** amaçlıdır.
Sahipliğini doğrulamadığınız sistemleri taramak yasa dışıdır. Üretilen KVKK
değerlendirmesi hukuki görüş değil, farkındalık amaçlı bilgilendirmedir.

---

*Bu proje Yazılım Gerçekleme ve Test dersi Ödev 3 kapsamında hazırlanmıştır.*
