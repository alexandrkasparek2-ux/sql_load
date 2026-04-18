import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleStravaCallback } from '../services/stravaService';
import { T, Spinner } from '../components/UI';

export default function StravaCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    // Cross-domain bounce: Railway → Vercel
    if (window.location.hostname.includes('railway.app')) {
      window.location.replace(
        `https://sql-load.vercel.app/strava/callback${window.location.search}`,
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state') ?? undefined;
    const err    = params.get('error');

    if (err) {
      setStatus('error');
      setMsg(err === 'access_denied'
        ? 'Přístup zamítnut. Zkus připojení znovu.'
        : `Chyba: ${err}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMsg('Chybí autorizační kód. Zkus to znovu.');
      return;
    }

    handleStravaCallback(code, state)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      })
      .catch((e: Error) => {
        setStatus('error');
        setMsg(e.message);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: T.bg, gap: 16, padding: 24,
    }}>
      {status === 'loading' && (
        <>
          <Spinner color="#fc4c02" size={40} />
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, color: T.text }}>
            Připojuji Strava…
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: '#30d158' }}>
            Strava připojena!
          </div>
          <div style={{ fontSize: 13, color: T.muted }}>Přesměrovávám…</div>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ fontSize: 48 }}>❌</div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, color: '#ff375f' }}>
            Připojení se nezdařilo
          </div>
          <div style={{ fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 1.6 }}>{msg}</div>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
              background: '#ff375f22', border: '1px solid #ff375f44',
              color: '#ff375f', fontSize: 13, fontWeight: 700,
            }}
          >
            Zpět do aplikace
          </button>
        </>
      )}
    </div>
  );
}
