import type { ReactNode } from 'react';
import { LiveBadge } from './LiveBadge';

interface Props {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  showLiveBadge?: boolean;
  liveBadgeVariant?: 'sync' | 'live' | 'rest';
}

export function TopBar({ title, subtitle, actions, showLiveBadge, liveBadgeVariant = 'sync' }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div className="label-caps" style={{ marginBottom: 4 }}>{title}</div>
        <div style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, letterSpacing: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {showLiveBadge && <LiveBadge variant={liveBadgeVariant} />}
        {actions}
      </div>
    </div>
  );
}

export default TopBar;
