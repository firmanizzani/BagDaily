import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminMetric({
  label,
  value,
  note,
  icon: Icon,
  tone = 'green',
  to,
  change,
}: {
  label: string;
  value: number | string;
  note?: string;
  icon: LucideIcon;
  tone?: 'green' | 'blue' | 'orange' | 'amber';
  to?: string;
  change?: ReactNode;
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
        {note && (to ? <Link to={to}>{note} →</Link> : <p>{note}</p>)}
        {change}
      </div>
    </article>
  );
}
