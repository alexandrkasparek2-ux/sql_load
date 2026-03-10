import React, { useState } from 'react';
import { T, Btn, Spinner } from '../components/UI';

interface LoginProps {
  onSignIn:  (email: string, password: string) => Promise<void>;
  onSignUp:  (email: string, password: string) => Promise<void>;
}

export default function Login({ onSignIn, onSignUp }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const accent = '#22c55e';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await onSignUp(email, password);
      } else {
        await onSignIn(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nastala chyba. Zkus to znovu.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    background:   T.card,
    border:       `1px solid ${T.border}`,
    borderRadius: 10,
    padding:      '12px 14px',
    color:        T.text,
    fontSize:     15,
    outline:      'none',
  };

  return (
    <div style={{
      minHeight:      '100dvh',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        24,
      background:     T.bg,
    }}>
      {/* Logo / Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🚴</div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize:   32,
          fontWeight: 800,
          color:      accent,
          margin:     0,
          lineHeight: 1,
        }}>
          CycloFuel
        </h1>
        <p style={{ color: T.muted, marginTop: 8, fontSize: 14 }}>
          Nutriční tracker pro cyklisty
        </p>
      </div>

      {/* Form card */}
      <div style={{
        width:        '100%',
        maxWidth:     400,
        background:   T.card,
        border:       `1px solid ${T.border}`,
        borderRadius: 18,
        padding:      28,
      }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize:   20,
          fontWeight: 700,
          color:      T.text,
          marginBottom: 20,
        }}>
          {isSignUp ? 'Vytvořit účet' : 'Přihlásit se'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: T.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              required
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: T.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Heslo
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? 'Min. 6 znaků' : '••••••••'}
              required
              minLength={6}
              style={inputStyle}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div style={{
              background:   '#ef444420',
              border:       '1px solid #ef444444',
              borderRadius: 8,
              padding:      '10px 12px',
              color:        '#fca5a5',
              fontSize:     13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:        '100%',
              padding:      '13px',
              background:   accent,
              border:       'none',
              borderRadius: 10,
              color:        '#fff',
              fontSize:     15,
              fontWeight:   700,
              cursor:       loading ? 'not-allowed' : 'pointer',
              opacity:      loading ? 0.7 : 1,
              fontFamily:   'DM Sans, sans-serif',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          8,
              boxShadow:    `0 0 16px ${accent}55`,
              transition:   'opacity 0.15s',
            }}
          >
            {loading && <Spinner color="#fff" size={18} />}
            {loading ? 'Zpracovávám…' : isSignUp ? 'Vytvořit účet' : 'Přihlásit se'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => { setIsSignUp(v => !v); setError(''); }}
            style={{
              background: 'none',
              border:     'none',
              color:      accent,
              fontSize:   14,
              cursor:     'pointer',
              textDecoration: 'underline',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {isSignUp
              ? 'Máš účet? Přihlásit se'
              : 'Nemáš účet? Registrovat se'}
          </button>
        </div>
      </div>

      <p style={{ color: T.muted, fontSize: 12, marginTop: 32, textAlign: 'center' }}>
        Sleduj výživu, hydrataci a mikronutrienty<br />přizpůsobené tvému tréninkovému dni.
      </p>
    </div>
  );
}
