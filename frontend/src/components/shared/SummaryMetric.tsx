import type { LucideIcon } from 'lucide-react';

export function SummaryMetric({
  title,
  value,
  note,
  icon: Icon,
  tone = 'green',
}: {
  title: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
  tone?: 'green' | 'sand';
}) {
  return (
    <article className="summary-metric-card">
      <div className={`summary-metric-icon ${tone}`}>
        <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="summary-metric-copy">
        <h2>{title}</h2>
        <strong>
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </strong>
        {note && <p>{note}</p>}
      </div>
    </article>
  );
}
