"use client";

import { useState } from "react";

type Severity = "kritik" | "yuksek" | "orta" | "dusuk" | "bilgi";

interface Finding {
  id: string;
  baslik: string;
  severity: Severity;
  mevcut: boolean;
  detay: string;
  kanit?: string;
}

interface ScanResult {
  finalUrl: string;
  durumKodu: number;
  sunucu?: string;
  bulgular: Finding[];
  tarananZaman: string;
  skor: number;
}

interface AiRapor {
  ozet: string;
  kvkkDegerlendirme: string;
  oncelikliAdimlar: string[];
  model: string;
}

const severityRenk: Record<Severity, string> = {
  kritik: "bg-red-500/15 text-red-300 border-red-500/40",
  yuksek: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  orta: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  dusuk: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  bilgi: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

const severityEtiket: Record<Severity, string> = {
  kritik: "KRİTİK",
  yuksek: "YÜKSEK",
  orta: "ORTA",
  dusuk: "DÜŞÜK",
  bilgi: "OLUMLU",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [rapor, setRapor] = useState<AiRapor | null>(null);
  const [dogrulama, setDogrulama] = useState<{
    token: string;
    host: string;
    mesaj: string;
  } | null>(null);

  async function tara() {
    setHata(null);
    setScan(null);
    setRapor(null);
    setDogrulama(null);
    if (!url.trim()) {
      setHata("Lütfen bir web adresi girin.");
      return;
    }
    setYukleniyor(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.status === 403 && data.hata === "dogrulama_gerekli") {
        setDogrulama({ token: data.token, host: data.host, mesaj: data.mesaj });
        return;
      }
      if (!res.ok) {
        setHata(data.mesaj || data.hata || "Bir hata oluştu.");
        return;
      }
      setScan(data.scan);
      setRapor(data.rapor);
    } catch {
      setHata("Sunucuya ulaşılamadı.");
    } finally {
      setYukleniyor(false);
    }
  }

  const skorRenk = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 45 ? "text-yellow-400" : "text-red-400";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
          🛡️ Etik · Pasif · KVKK odaklı
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Kalkan<span className="text-sky-400">AI</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          KOBİ ve esnafın web sitelerini yapay zekâ ile tarayan güvenlik
          asistanı. Bulguları, teknik bilgi gerektirmeyen bir dille ve KVKK
          yükümlülükleri bağlamında Türkçe rapora dönüştürür.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5 shadow-xl backdrop-blur">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Taranacak web sitesi (sahibi olduğunuz site)
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tara()}
            placeholder="örnek: isletmesitem.com"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
          />
          <button
            onClick={tara}
            disabled={yukleniyor}
            className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {yukleniyor ? "Taranıyor…" : "Taramayı Başlat"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          ⚖️ Yalnızca sahipliğini doğruladığınız siteleri tarayabilirsiniz.
          KalkanAI yalnızca pasif gözlem yapar; sitenize saldırı veya sızma
          denemesi gerçekleştirmez.
        </p>
      </div>

      {hata && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">
          {hata}
        </div>
      )}

      {dogrulama && (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-300">
            🔐 Sahiplik doğrulaması gerekli
          </h3>
          <p className="mb-4 text-sm text-amber-200/80">{dogrulama.mesaj}</p>
          <p className="mb-2 text-sm text-slate-300">
            <strong>{dogrulama.host}</strong> sitesinin sahibi olduğunuzu
            kanıtlamak için aşağıdaki etiketi sitenizin ana sayfasındaki{" "}
            <code className="text-sky-300">&lt;head&gt;</code> bölümüne ekleyin,
            ardından taramayı tekrar başlatın:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-emerald-300">
            {`<meta name="kalkan-verify" content="${dogrulama.token}" />`}
          </pre>
          <p className="mt-3 text-xs text-slate-500">
            Alternatif olarak bu içeriği{" "}
            <code className="text-sky-300">
              /.well-known/kalkan-verify.txt
            </code>{" "}
            dosyasına da koyabilirsiniz.
          </p>
        </div>
      )}

      {scan && rapor && (
        <div className="mt-8 space-y-6">
          {/* Skor kartı */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 sm:flex-row sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Taranan site</p>
              <p className="font-mono text-sky-300">{scan.finalUrl}</p>
              <p className="mt-1 text-xs text-slate-500">
                HTTP {scan.durumKodu}
                {scan.sunucu ? ` · Sunucu: ${scan.sunucu}` : ""} ·{" "}
                {new Date(scan.tarananZaman).toLocaleString("tr-TR")}
              </p>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${skorRenk(scan.skor)}`}>
                {scan.skor}
              </div>
              <div className="text-xs text-slate-500">/ 100 güvenlik skoru</div>
            </div>
          </div>

          {/* AI Rapor */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-sky-300">
              🤖 Yapay Zekâ Değerlendirmesi
            </h2>
            <p className="mb-4 text-slate-200">{rapor.ozet}</p>
            <div className="mb-4 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4">
              <h3 className="mb-1 text-sm font-semibold text-amber-300">
                ⚖️ KVKK Değerlendirmesi
              </h3>
              <p className="text-sm text-slate-300">{rapor.kvkkDegerlendirme}</p>
            </div>
            {rapor.oncelikliAdimlar.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-200">
                  📋 Öncelikli Adımlar
                </h3>
                <ol className="space-y-2">
                  {rapor.oncelikliAdimlar.map((adim, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-lg bg-slate-950/40 p-3 text-sm text-slate-300"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950">
                        {i + 1}
                      </span>
                      <span>{adim}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="mt-4 text-right text-xs text-slate-600">
              Model: {rapor.model}
            </p>
          </div>

          {/* Teknik bulgular */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-200">
              🔍 Teknik Bulgular
            </h2>
            <div className="space-y-3">
              {scan.bulgular.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-slate-100">{b.baslik}</h3>
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${
                        severityRenk[b.severity]
                      }`}
                    >
                      {severityEtiket[b.severity]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{b.detay}</p>
                  {b.kanit && (
                    <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs text-slate-500">
                      {b.kanit}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
        KalkanAI — Yazılım Gerçekleme ve Test dersi ödev projesi · XBOW
        (yapay zekâ pentest ajanı) esinli yerelleştirilmiş klon · Yalnızca
        eğitim ve yetkili güvenlik testi amaçlıdır.
      </footer>
    </main>
  );
}
