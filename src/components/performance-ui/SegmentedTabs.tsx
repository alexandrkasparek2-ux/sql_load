interface Props {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function SegmentedTabs({ tabs, active, onChange }: Props) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, marginBottom: 16, overflowX: 'auto' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: '1 0 auto',
              padding: '10px 12px',
              border: 0,
              borderRadius: 8,
              background: isActive ? 'linear-gradient(135deg, rgba(255,214,0,0.15), rgba(255,107,53,0.08))' : 'transparent',
              color: isActive ? 'var(--brand-primary)' : 'var(--text-disabled)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'background 200ms ease-out, color 200ms ease-out',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
