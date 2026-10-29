import { Landmark, QrCode, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatRupiah } from '@/lib/utils';

export type OnlinePaymentMethod = 'qris' | 'bank_transfer';

interface OnlinePaymentPanelProps {
  total: number;
  deadline: string | null;
  method: OnlinePaymentMethod;
  isProcessing: boolean;
  isExpired: boolean;
  onMethodChange: (method: OnlinePaymentMethod) => void;
  onPay: () => void;
}

export function OnlinePaymentPanel({
  total,
  deadline,
  method,
  isProcessing,
  isExpired,
  onMethodChange,
  onPay,
}: OnlinePaymentPanelProps) {
  return (
    <section className="online-payment" aria-labelledby="payment-method-heading">
      <h2 id="payment-method-heading">Pilih metode pembayaran</h2>
      <p className="payment-intro">Pilih cara bayar yang paling nyaman untukmu.</p>
      <fieldset className="online-payment-methods" disabled={isProcessing || isExpired}>
        <legend className="sr-only">Metode pembayaran</legend>
        {(
          [
            { value: 'qris', label: 'QRIS', description: 'Scan kode QR', icon: QrCode },
            {
              value: 'bank_transfer',
              label: 'Transfer Bank',
              description: 'Lihat rekening tujuan',
              icon: Landmark,
            },
          ] as const
        ).map(({ value, label, description, icon: Icon }) => (
          <label key={value} className={method === value ? 'selected' : ''}>
            <input
              type="radio"
              name="online-payment-method"
              value={value}
              checked={method === value}
              onChange={() => onMethodChange(value)}
            />
            <Icon size={22} aria-hidden="true" />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {method === 'qris' ? (
        <div className="online-qris">
          <img
            src="/images/qris-demo.svg"
            alt="QR demo BagDaily, bukan kode pembayaran asli"
            width={176}
            height={176}
          />
          <div className="online-qris-info">
            <div>
              <strong>QRIS</strong>
              <span>SIMULASI</span>
            </div>
            <p>BagDaily</p>
            <p className="online-qris-total-label">Total pembayaran</p>
            <strong className="online-pay-amount">{formatRupiah(total)}</strong>
          </div>
        </div>
      ) : (
        <div className="online-bank">
          <h3>
            <Landmark size={20} aria-hidden="true" /> Rekening tujuan{' '}
            <span>SIMULASI</span>
          </h3>
          <dl>
            <div>
              <dt>Bank</dt>
              <dd>Bank Demo</dd>
            </div>
            <div>
              <dt>Nomor rekening</dt>
              <dd>0000 0000 0000</dd>
            </div>
            <div>
              <dt>Atas nama</dt>
              <dd>BagDaily Demo</dd>
            </div>
            <div className="online-bank-total">
              <dt>Total transfer</dt>
              <dd>{formatRupiah(total)}</dd>
            </div>
          </dl>
          <p>Untuk transfer, nominal harus sesuai total tagihan.</p>
        </div>
      )}
      <p className="payment-demo-note">
        Mode demo. QR dan rekening ini hanya contoh; tidak perlu mengirim uang. Tombol di
        bawah menyimulasikan pembayaran.
      </p>
      {deadline && (
        <p className={isExpired ? 'payment-deadline expired' : 'payment-deadline'}>
          <Clock size={15} aria-hidden="true" />{' '}
          {isExpired ? (
            'Waktu pembayaran sudah habis.'
          ) : (
            <>
              Bayar sebelum <strong>{formatDate(deadline)}</strong>
            </>
          )}
        </p>
      )}
      <Button
        variant="teal"
        size="lg"
        className="online-pay-button"
        disabled={isProcessing || isExpired}
        onClick={onPay}
      >
        {isProcessing
          ? 'Memproses pembayaran…'
          : isExpired
            ? 'Waktu pembayaran habis'
            : 'Bayar sekarang · ' + formatRupiah(total)}
      </Button>
      <p className="payment-after-note">
        Setelah pembayaran berhasil, pesanan akan diproses toko.
      </p>
    </section>
  );
}
