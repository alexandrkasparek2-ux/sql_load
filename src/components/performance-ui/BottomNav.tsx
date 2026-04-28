import type { ReactNode } from 'react';

interface Props {
  active: 'overview' | 'meals' | 'ai' | 'plan' | 'supl' | 'profile';
  onChange: (tab: string) => void;
}

const items: Array<{ id: Props['active']; label: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Přehled', icon: '⌂' },
  { id: 'meals', label: 'Jídla', icon: '☕' },
  { id: 'ai', label: 'AI', icon: '⚡' },
  { id: 'plan', label: 'Plán', icon: '▣' },
  { id: 'supl', label: 'Supl.', icon: '◎' },
  { id: 'profile', label: 'Profil', icon: '♙' },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 75, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #181818', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 10px 10px', zIndex: 100 }}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} style={{ position: 'relative', background: 'transparent', border: 0, color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', minWidth: 48 }}>
            {isActive && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, background: 'linear-gradient(90deg,#FFD600,#FF6B35)', borderRadius: '0 0 3px 3px' }} />}
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
