import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import { datePresetForRange, presetDateRange, type DatePreset, type DateRange } from '@/lib/dateRange';

const presets: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari ini' },
  { id: 'last7', label: '7 hari terakhir' },
  { id: 'last30', label: '30 hari terakhir' },
];
export function DateRangeFilter({ value, onChange, label = 'Pilih periode laporan' }: { value: DateRange; onChange: (range: DateRange) => void; label?: string }) {
  const root = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(value);
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);
  const selected = datePresetForRange(draft);
  return <details ref={root} className="admin-date-range">
    <summary onClick={() => setDraft(value)}><CalendarDays size={15} /><span>{value.from ? formatShortDate(value.from) : 'Semua tanggal'}{value.to && ` – ${formatShortDate(value.to)}`}</span><ChevronDown size={14} /></summary>
    <form onSubmit={event => { event.preventDefault(); if (invalid) return; onChange({ ...draft, comparison: 'period' }); root.current?.removeAttribute('open'); }}>
      <label className="admin-date-preset-select">Periode
        <select aria-label={label} value={selected ?? ''} onChange={event => {
          const preset = event.target.value as DatePreset;
          const range: DateRange = { ...presetDateRange(preset), ...(preset === 'all' ? {} : { comparison: preset === 'today' ? 'day' : preset === 'last7' ? '7days' : '30days' }) };
          setDraft(range); onChange(range); root.current?.removeAttribute('open');
        }}>
          {!selected && <option value="" disabled>Rentang tanggal khusus</option>}
          {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </label>
      <label>Dari tanggal<input required type="date" value={draft.from} max={draft.to || undefined} onChange={event => setDraft({ ...draft, from: event.target.value, comparison: 'period' })} /></label>
      <label>Sampai tanggal<input required type="date" value={draft.to} min={draft.from || undefined} onChange={event => setDraft({ ...draft, to: event.target.value, comparison: 'period' })} /></label>
      {invalid && <p role="alert">Tanggal akhir harus sesudah tanggal awal.</p>}
      <div><button type="button" className="admin-secondary-button" onClick={() => { setDraft(value); root.current?.removeAttribute('open'); }}>Batal</button><button type="submit" disabled={invalid} className="admin-primary-button">Terapkan</button></div>
    </form>
  </details>;
}
