import type { Order } from '@/types/api';
import { formatRupiah } from '@/lib/utils';

export interface PosReceiptProps {
  order: Order;
}

export function PosReceipt({ order }: PosReceiptProps) {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-dashed border-[#001524]/30 bg-white p-6 font-mono text-xs text-[#001524] space-y-3 shadow-xs">
      <div className="text-center border-b border-dashed border-[#001524]/20 pb-3">
        <p className="font-black text-base">BAGDAILY</p>
        <p className="text-[10px] text-[#6E7E8D]">Toko Tas UMKM Keseharian</p>
        <p className="text-[10px] text-[#6E7E8D]">Jl. UMKM Kreatif No. 24, Jakarta</p>
      </div>

      <div className="text-[11px] space-y-0.5">
        <p>No: {order.orderNumber}</p>
        <p>Kasir: {order.cashierName || 'Kasir'}</p>
        <p>Waktu: {new Date(order.createdAt).toLocaleString('id-ID')}</p>
      </div>

      <div className="border-t border-dashed border-[#001524]/20 pt-2 space-y-1.5">
        {order.items?.map(it => (
          <div key={it.id} className="flex justify-between">
            <div className="min-w-0 pr-2">
              <p className="font-bold truncate">{it.productNameSnapshot}</p>
              <p className="text-[10px] text-[#6E7E8D]">
                {it.quantity} × {it.unitPrice}
              </p>
            </div>
            <span className="font-bold">{it.subtotal}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-[#001524]/20 pt-2 space-y-1 text-right">
        <p className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>{formatRupiah(order.total)}</span>
        </p>
        <p className="flex justify-between text-[11px]">
          <span>TUNAI:</span>
          <span>{formatRupiah(order.cashReceived || order.total)}</span>
        </p>
        <p className="flex justify-between text-[11px]">
          <span>KEMBALI:</span>
          <span>{formatRupiah(order.changeAmount || 0)}</span>
        </p>
      </div>

      <div className="text-center border-t border-dashed border-[#001524]/20 pt-3 text-[10px] text-[#6E7E8D]">
        <p>Terima kasih telah berbelanja di BagDaily!</p>
        <p>Barang yang sudah dibeli dapat ditukar jika cacat produksi maks 2 hari.</p>
      </div>
    </div>
  );
}
