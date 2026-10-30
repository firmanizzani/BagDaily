import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminMetric({
  label,
  value,
  note,
  icon: Icon,
  tone = 'green',
  to,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
  tone?: 'green' | 'blue' | 'orange' | 'amber';
  to?: string;
}) {
  return (
    <article className={`admin-metric metric-${tone}`}>
      <span className="admin-metric-icon">
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <div>
        <h2>{label}</h2>
        <strong>
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </strong>
        {to ? <Link to={to}>{note} →</Link> : <p>{note}</p>}
      </div>
    </article>
  );
}
