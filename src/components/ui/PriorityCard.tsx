interface Priority {
  number: 1 | 2 | 3;
  text: string;
  color: 'action' | 'success' | 'analytics';
}

interface Props {
  priorities: Priority[];
}

const colors: Record<Priority['color'], string> = {
  action: 'var(--brand-primary)',
  success: 'var(--status-success)',
  analytics: 'var(--analytics-blue)',
};

export function PriorityCard({ priorities }: Props) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Co z toho plyne dnes</div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
        Nejbližší kroky pro dnešní výkon a regeneraci.
      </div>
      {priorities.map(priority => (
        <div key={priority.number} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12, marginBottom: priority.number === 3 ? 0 : 8 }}>
          <div className="label-caps" style={{ marginBottom: 4 }}>Priorita {priority.number}</div>
          <div style={{ color: colors[priority.color], fontSize: 14, fontWeight: 800, lineHeight: 1.4 }}>{priority.text}</div>
        </div>
      ))}
    </div>
  );
}

export default PriorityCard;
