import React, { useRef, useEffect, useState, useCallback } from 'react';
import { T } from './UI';
import type { Food } from '../constants/foods';

// ── Open Food Facts mapping ───────────────────────────────
async function lookupBarcode(barcode: string): Promise<Food | null> {
  try {
    const res  = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { 'User-Agent': 'CycloFuel/1.0' } },
    );
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const n = p.nutriments ?? {};

    // OFF stores most minerals in mg/100g but sodium in g/100g
    const safeN = (key: string, fallback = 0) => {
      const v = n[key];
      return typeof v === 'number' ? v : fallback;
    };

    const name =
      p.product_name_cs ||
      p.product_name ||
      p.generic_name ||
      `EAN ${barcode}`;

    return {
      id:      `barcode_${barcode}`,
      cat:     '🔍 Naskenované',
      name:    name.trim() || `EAN ${barcode}`,
      kcal:    safeN('energy-kcal_100g') || Math.round(safeN('energy_100g') / 4.184),
      carbs:   safeN('carbohydrates_100g'),
      protein: safeN('proteins_100g'),
      fat:     safeN('fat_100g'),
      per:     100,
      micros: {
        na:     Math.round(safeN('sodium_100g') * 1000),  // g → mg
        k:      safeN('potassium_100g'),
        mg:     safeN('magnesium_100g'),
        ca:     safeN('calcium_100g'),
        fe:     safeN('iron_100g'),
        vit_c:  safeN('vitamin-c_100g'),
        vit_d:  safeN('vitamin-d_100g'),
        b12:    safeN('vitamin-b12_100g'),
        omega3: Math.round(safeN('alpha-linolenic-acid_100g') * 1000),
        zn:     safeN('zinc_100g'),
      },
    } satisfies Food;
  } catch {
    return null;
  }
}

// ── BarcodeDetector (Chrome/Android native API) ───────────
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect(source: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
    };
  }
}

interface BarcodeScannerProps {
  accent:   string;
  onResult: (food: Food) => void;
  onClose:  () => void;
}

export default function BarcodeScanner({ accent, onResult, onClose }: BarcodeScannerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const rafRef        = useRef<number>(0);
  const detectorRef   = useRef<InstanceType<NonNullable<Window['BarcodeDetector']>> | null>(null);

  const [status,   setStatus]   = useState<'init' | 'scanning' | 'fetching' | 'error'>('init');
  const [errorMsg, setErrorMsg] = useState('');
  const [manual,   setManual]   = useState('');

  // Stop camera stream
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Start scanning loop
  const startScan = useCallback(async () => {
    if (!window.BarcodeDetector) {
      setStatus('error');
      setErrorMsg('Skener čárových kódů není podporován v tomto prohlížeči. Zadej kód ručně.');
      return;
    }
    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('scanning');

      const scan = async () => {
        if (!videoRef.current || !detectorRef.current || status === 'fetching') return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            stopCamera();
            await handleBarcode(code);
            return;
          }
        } catch { /* ignore frame errors */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);

    } catch (e) {
      setStatus('error');
      setErrorMsg('Nepodařilo se spustit kameru. Zkontroluj oprávnění.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarcode = async (code: string) => {
    setStatus('fetching');
    const food = await lookupBarcode(code);
    if (food) {
      onResult(food);
    } else {
      setStatus('error');
      setErrorMsg(`Produkt s kódem ${code} nebyl nalezen v databázi Open Food Facts.`);
    }
  };

  useEffect(() => {
    startScan();
    return () => stopCamera();
  }, [startScan, stopCamera]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    await handleBarcode(manual.trim());
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200 }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 500,
        background: T.card, borderRadius: '20px 20px 0 0',
        border: `1px solid ${T.border}`, borderBottom: 'none',
        zIndex: 201, maxHeight: '80dvh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        <div style={{ padding: '12px 16px 28px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: T.text }}>
              🔍 Skener čárového kódu
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Camera view */}
          {status === 'scanning' && (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#000' }}>
              <video
                ref={videoRef}
                muted playsInline
                style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }}
              />
              {/* Scan line */}
              <div style={{
                position: 'absolute', left: '10%', right: '10%', top: '50%',
                height: 2, background: accent, boxShadow: `0 0 8px ${accent}`,
                animation: 'scanline 1.5s ease-in-out infinite',
              }} />
              <style>{`@keyframes scanline { 0%,100% { top:30% } 50% { top:70% } }`}</style>
              <div style={{
                position: 'absolute', inset: 0, border: `2px solid ${accent}33`,
                borderRadius: 12, pointerEvents: 'none',
              }} />
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 12, opacity: 0.8 }}>
                Namiř kameru na čárový kód
              </div>
            </div>
          )}

          {status === 'init' && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: T.muted, fontSize: 14 }}>
              Spouštím kameru…
            </div>
          )}

          {status === 'fetching' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ color: accent, fontSize: 14, marginBottom: 8 }}>Hledám produkt…</div>
              <div style={{ fontSize: 12, color: T.muted }}>Prohledávám Open Food Facts databázi</div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ background: '#ef444420', border: '1px solid #ef444444', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
              {errorMsg}
            </div>
          )}

          {/* Manual entry */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
              Nebo zadej čárový kód ručně:
            </div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={manual}
                onChange={e => setManual(e.target.value)}
                placeholder="Např. 8594003680039"
                pattern="[0-9]{8,14}"
                style={{
                  flex: 1, background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: '10px 12px', color: T.text,
                  fontSize: 14, outline: 'none', fontFamily: 'DM Sans, sans-serif',
                }}
              />
              <button
                type="submit"
                style={{
                  background: accent, border: 'none', borderRadius: 8,
                  padding: '10px 16px', color: '#fff', fontWeight: 600,
                  cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Hledat
              </button>
            </form>
          </div>

          {status === 'error' && (
            <button
              onClick={() => { setStatus('init'); setErrorMsg(''); startScan(); }}
              style={{
                width: '100%', marginTop: 12, padding: '10px', background: accent + '22',
                border: `1px solid ${accent}44`, borderRadius: 8, color: accent,
                fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Zkusit znovu
            </button>
          )}
        </div>
      </div>
    </>
  );
}
