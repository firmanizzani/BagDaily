import { formatRupiah } from '@/lib/utils';
import type { LoyaltySummary } from '@/features/loyalty/types';

export function PointRedemption({ wallet, loading, error, total, enabled, amount, onEnabledChange, onAmountChange, disabled = false, channel, onRetry }: {
  wallet?: LoyaltySummary;
  loading: boolean;
  error: boolean;
  total: number;
  enabled: boolean;
  amount: number;
  onEnabledChange: (enabled: boolean) => void;
  onAmountChange: (amount: number) => void;
  disabled?: boolean;
  channel: 'online' | 'pos';
  onRetry: () => void;
}) {
  const maximum = Math.min(wallet?.available ?? 0, total);
  const used = enabled ? Math.min(amount, maximum) : 0;
  return <section className={`point-redemption${enabled ? ' is-active' : ''}`} aria-label="Poin member">
    <div className="point-redemption-heading"><div><strong>Gunakan poin</strong><span>1 poin = Rp1</span></div>{!loading && !error && <label className="point-switch"><input type="checkbox" role="switch" aria-label="Gunakan poin untuk transaksi ini" checked={enabled} disabled={disabled || (!enabled && maximum <= 0)} onChange={event => { onEnabledChange(event.target.checked); if (event.target.checked) onAmountChange(maximum); }} /><span aria-hidden="true" /></label>}</div>
    {loading ? <p role="status">Memuat saldo poin…</p> : error ? <p role="alert">Saldo poin belum dapat dimuat. <button type="button" onClick={onRetry}>Coba lagi</button></p> : <>
      <p className="point-available"><strong>{(wallet?.available ?? 0).toLocaleString('id-ID')} poin</strong> tersedia{wallet?.reserved ? ` · ${wallet.reserved.toLocaleString('id-ID')} poin ditahan pesanan lain` : ''}</p>
      {enabled && <div className="point-redemption-controls"><label className="point-amount">Jumlah poin<div><input type="number" aria-label="Jumlah poin yang digunakan" inputMode="numeric" min={0} max={maximum} step={1} value={used} disabled={disabled} onChange={event => onAmountChange(Math.max(0, Math.min(maximum, Math.trunc(Number(event.target.value) || 0))))} /><button type="button" disabled={disabled || used === maximum} onClick={() => onAmountChange(maximum)}>Maksimal</button></div><small>Maks. {maximum.toLocaleString('id-ID')} poin</small></label><p className="point-saving">Potongan belanja<strong>−{formatRupiah(used)}</strong></p></div>}
    </>}
    <p className="point-estimate">Dapat <strong>+{Math.floor(Math.max(0, total - used) / 100).toLocaleString('id-ID')} poin</strong> {channel === 'online' ? 'setelah pesanan diterima dan selesai.' : 'setelah transaksi selesai.'}</p>
  </section>;
}
