import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../services/whoopService';
import { T, Spinner } from '../components/UI';

export default function WhoopCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
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

    handleCallback(code)
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
          <Spinner color="#00e5cc" size={40} />
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, color: T.text }}>
            Připojuji Whoop…
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: '#30d158' }}>
            Whoop připojen!
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
