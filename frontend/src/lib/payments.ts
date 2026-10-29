import type { PaymentMethod } from '@/types/api';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  debit: 'Kartu Debit',
  credit: 'Kartu Kredit',
  qris: 'QRIS',
  bank_transfer: 'Transfer Bank',
};
