import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import { presetDateRange, recentDateRange, type DatePreset, type DateRange } from '@/lib/dateRange';

const presets: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari ini' },
  { id: 'week', label: 'Minggu ini' },
  { id: 'month', label: 'Bulan ini' },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const root = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(value);
  const [presetChoice, setPresetChoice] = useState<DatePreset | null>(null);
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);
  const matches = (id: DatePreset) => {
    const range = presetDateRange(id);
    return range.from === value.from && range.to === value.to;
  };
  const selected =
    presetChoice && matches(presetChoice)
      ? presetChoice
      : presets.find(preset => {
          const range = presetDateRange(preset.id);
          return range.from === value.from && range.to === value.to;
        })?.id;
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
          setPresetChoice(null);
          onChange({ ...draft, comparison: 'period' });
          root.current?.removeAttribute('open');
        }}
      >
        <div
          className="admin-date-presets"
          role="group"
          aria-label="Pilihan cepat periode"
        >
          {presets.map(preset => (
            <button
              type="button"
              key={preset.id}
              aria-pressed={selected === preset.id}
              onClick={() => {
                const range = { ...presetDateRange(preset.id), ...(preset.id === 'all' ? {} : { comparison: preset.id === 'today' ? 'day' as const : preset.id }) };
                setDraft(range);
                setPresetChoice(preset.id);
                onChange(range);
                root.current?.removeAttribute('open');
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
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
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => {
              setDraft(value);
              root.current?.removeAttribute('open');
            }}
          >
            Batal
          </button>
          <button
            type="button"
            className="admin-date-reset"
            title="Kembali ke 30 hari terakhir"
            onClick={() => {
              const range = recentDateRange();
              setDraft(range);
              setPresetChoice(null);
              onChange(range);
              root.current?.removeAttribute('open');
            }}
          >
            Reset
          </button>
          <button type="submit" disabled={invalid} className="admin-primary-button">
            Terapkan
          </button>
        </div>
      </form>
    </details>
  );
}
