import * as Dialog from '@radix-ui/react-dialog';
import { Check, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PosReceipt } from '@/components/cashier/PosReceipt';
import { formatRupiah } from '@/lib/utils';
import { paymentMethodLabels } from '@/lib/payments';
import type { Order } from '@/types/api';

export function PosSuccessDialog({
  order,
  open,
  onOpenChange,
  onNewTransaction,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTransaction: () => void;
}) {
  const cash =
    order.paymentMethod === 'cash' ||
    (!order.paymentMethod && order.cashReceived != null);
  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay no-print" />
          <Dialog.Content className="dialog-content pos-success-dialog no-print">
            <header className="pos-success-heading">
              <span className="pos-success-icon">
                <Check size={23} aria-hidden="true" />
              </span>
              <div>
                <Dialog.Title>Transaksi berhasil</Dialog.Title>
                <Dialog.Description>
                  Pembayaran tercatat dan stok telah diperbarui.
                </Dialog.Description>
              </div>
            </header>
            <dl className="pos-success-summary">
              <div>
                <dt>Total pembayaran</dt>
                <dd>{formatRupiah(order.total)}</dd>
              </div>
              {cash ? (
                <div>
                  <dt>Kembalian</dt>
                  <dd>{formatRupiah(order.changeAmount ?? 0)}</dd>
                </div>
              ) : (
                <div>
                  <dt>Metode pembayaran</dt>
                  <dd>
                    {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : '—'}
                  </dd>
                </div>
              )}
            </dl>
            <div
              className="pos-success-preview"
              tabIndex={0}
              role="region"
              aria-label="Pratinjau struk pembelian"
            >
              <PosReceipt order={order} />
            </div>
            <footer className="pos-success-actions">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={17} aria-hidden="true" />
                Cetak struk
              </Button>
              <Button variant="teal" onClick={onNewTransaction}>
                Transaksi baru
              </Button>
            </footer>
            <Dialog.Close className="dialog-close" aria-label="Tutup struk">
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="pos-receipt-print">
        <PosReceipt order={order} />
      </div>
    </>
  );
}
