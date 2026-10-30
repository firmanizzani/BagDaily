import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import { recentDateRange, type DateRange } from '@/lib/dateRange';

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const root = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(value);
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);
  return (
    <details ref={root} className="admin-date-range">
      <summary onClick={() => setDraft(value)}>
        <CalendarDays size={15} />
        <span>
          {value.from ? formatShortDate(value.from) : 'Semua tanggal'}
          {value.to && ` – ${formatShortDate(value.to)}`}
        </span>
        <ChevronDown size={14} />
      </summary>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (invalid) return;
          onChange(draft);
          root.current?.removeAttribute('open');
        }}
      >
        <label>
          Dari tanggal
          <input
            required
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={event => setDraft({ ...draft, from: event.target.value })}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            required
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={event => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        {invalid && <p role="alert">Tanggal akhir harus sesudah tanggal awal.</p>}
        <div>
          <button type="button" onClick={() => setDraft(recentDateRange())}>
            30 hari terakhir
          </button>
          <button type="submit" disabled={invalid} className="admin-primary-button">
            Terapkan
          </button>
        </div>
      </form>
    </details>
  );
}
