import { useEffect, useState } from 'react';
import { BRAND } from './UI';

export function showToast(msg: string, type: 'success' | 'error' = 'success') {
  window.dispatchEvent(new CustomEvent('cyclofuel-toast', { detail: { msg, type } }));
}

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { msg, type } = (e as CustomEvent<{ msg: string; type: 'success' | 'error' }>).detail;
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
    };
    window.addEventListener('cyclofuel-toast', handler);
    return () => window.removeEventListener('cyclofuel-toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 95, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8,
      pointerEvents: 'none', width: '100%', maxWidth: 500, padding: '0 16px',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:   t.type === 'success' ? BRAND.green : BRAND.red,
          color:        '#000',
          borderRadius: 12,
          padding:      '10px 16px',
          fontSize:     13,
          fontWeight:   600,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          boxShadow:    `0 4px 24px ${(t.type === 'success' ? BRAND.green : BRAND.red)}55`,
          animation:    'fadeInUp 0.25s ease-out both',
        }}>
          <span style={{ fontSize: 15 }}>{t.type === 'success' ? '✓' : '✕'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
