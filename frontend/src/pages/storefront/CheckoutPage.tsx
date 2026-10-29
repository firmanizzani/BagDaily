import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAction, useApi, useUser } from '@/hooks/api';
import type { Courier, Order, ShippingRate, ShippingZone } from '@/types/api';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';

const schema = z
  .object({
    deliveryMethod: z.enum(['shipping', 'pickup']),
    shippingRateId: z.string().optional(),
    recipientName: z.string().optional(),
    recipientPhone: z.string().optional(),
    shippingAddress: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.deliveryMethod !== 'shipping') return;
    if (!value.recipientName || value.recipientName.trim().length < 2)
      ctx.addIssue({
        code: 'custom',
        path: ['recipientName'],
        message: 'Nama penerima minimal 2 karakter.',
      });
    if (!value.recipientPhone || value.recipientPhone.trim().length < 6)
      ctx.addIssue({
        code: 'custom',
        path: ['recipientPhone'],
        message: 'Masukkan nomor telepon penerima yang valid.',
      });
    if (!value.shippingAddress || value.shippingAddress.trim().length < 5)
      ctx.addIssue({
        code: 'custom',
        path: ['shippingAddress'],
        message: 'Masukkan alamat pengiriman yang lengkap.',
      });
  });

type FormValues = z.infer<typeof schema>;

export function CheckoutPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { items, subtotal, clearCart } = useCartStore();
  const rates = useApi<ShippingRate[]>('/shipping/rates');
  const createOrder = useAction<Order>();
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [selectedCourier, setSelectedCourier] = useState<Courier>('JNE');
  const [selectedZone, setSelectedZone] = useState<ShippingZone>('Jabodetabek');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deliveryMethod: 'shipping',
      recipientName: user?.name || '',
      recipientPhone: user?.phone || '',
      shippingAddress: user?.address || '',
    },
  });

  const deliveryMethod = watch('deliveryMethod');

  if (userLoading) return <LoadingState label="Memeriksa sesi checkout…" />;
  if (!user) return <Navigate to="/login?from=/checkout" replace />;
  if (createdOrderId) return <Navigate to={`/orders/${createdOrderId}/pay`} replace />;
  if (items.length === 0) return <Navigate to="/cart" replace />;

  const currentRate = rates.data?.data?.find(
    r => r.courier === selectedCourier && r.zone === selectedZone,
  );

  const shippingCost = deliveryMethod === 'pickup' ? 0 : currentRate?.rate || 0;
  const grandTotal = subtotal() + shippingCost;

  const onSubmit = async (data: FormValues) => {
    if (data.deliveryMethod === 'shipping' && !currentRate) {
      return;
    }

    const payload = {
      items: items.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      deliveryMethod: data.deliveryMethod,
      shippingRateId: data.deliveryMethod === 'shipping' ? currentRate?.id : undefined,
      recipientName: data.deliveryMethod === 'shipping' ? data.recipientName : undefined,
      recipientPhone:
        data.deliveryMethod === 'shipping' ? data.recipientPhone : undefined,
      shippingAddress:
        data.deliveryMethod === 'shipping' ? data.shippingAddress : undefined,
    };

    try {
      const res = await createOrder.mutateAsync({
        path: '/orders',
        method: 'POST',
        body: payload,
      });

      // Commit the destination before clearing the external cart store so that
      // the empty-cart guard cannot override the payment redirect.
      flushSync(() => setCreatedOrderId(res.data.id));
      clearCart();
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // The mutation displays the API error and keeps the cart available for retry.
      return;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#001524]">Checkout Pesanan</h1>
        <p className="text-xs text-[#6E7E8D]">
          Lengkapi pengiriman, lalu lanjutkan ke halaman pembayaran.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-xl border border-[#001524]/10 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-[#001524] mb-3">Metode Penerimaan</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-[#6E7E8D]/30 p-3 text-xs font-semibold cursor-pointer has-checked:border-[#15616D] has-checked:bg-[#E6EEF0]/50">
                  <input type="radio" value="shipping" {...register('deliveryMethod')} />
                  <span>Kirim ke Alamat</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[#6E7E8D]/30 p-3 text-xs font-semibold cursor-pointer has-checked:border-[#15616D] has-checked:bg-[#E6EEF0]/50">
                  <input type="radio" value="pickup" {...register('deliveryMethod')} />
                  <span>Ambil di Toko (Bebas Ongkir)</span>
                </label>
              </div>
            </div>

            {deliveryMethod === 'shipping' ? (
              <div className="rounded-xl border border-[#001524]/10 bg-white p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-[#001524]">Informasi Pengiriman</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#001524] mb-1">
                      Pilihan Kurir
                    </label>
                    <select
                      value={selectedCourier}
                      onChange={e => setSelectedCourier(e.target.value as Courier)}
                      className="w-full rounded-md border border-[#6E7E8D]/30 bg-white px-3 py-2 text-xs"
                    >
                      <option value="JNE">JNE</option>
                      <option value="J&T">J&T</option>
                      <option value="SiCepat">SiCepat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#001524] mb-1">
                      Zona Tujuan
                    </label>
                    <select
                      value={selectedZone}
                      onChange={e => setSelectedZone(e.target.value as ShippingZone)}
                      className="w-full rounded-md border border-[#6E7E8D]/30 bg-white px-3 py-2 text-xs"
                    >
                      <option value="Jabodetabek">Jabodetabek</option>
                      <option value="Jawa">Jawa</option>
                      <option value="Luar Jawa">Luar Jawa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#001524] mb-1">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    {...register('recipientName', {
                      required: deliveryMethod === 'shipping',
                    })}
                    placeholder="Nama lengkap"
                    className="w-full rounded-md border border-[#6E7E8D]/30 px-3 py-2 text-xs"
                  />
                  {errors.recipientName ? (
                    <p className="text-[10px] text-rose-600 mt-1">Nama wajib diisi</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#001524] mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    {...register('recipientPhone', {
                      required: deliveryMethod === 'shipping',
                    })}
                    placeholder="0812xxxxxxxx"
                    className="w-full rounded-md border border-[#6E7E8D]/30 px-3 py-2 text-xs"
                  />
                  {errors.recipientPhone ? (
                    <p className="text-[10px] text-rose-600 mt-1">Telepon wajib diisi</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#001524] mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={3}
                    {...register('shippingAddress', {
                      required: deliveryMethod === 'shipping',
                    })}
                    placeholder="Jalan, RT/RW, Kecamatan, Kota, Kode Pos"
                    className="w-full rounded-md border border-[#6E7E8D]/30 px-3 py-2 text-xs"
                  />
                  {errors.shippingAddress ? (
                    <p className="text-[10px] text-rose-600 mt-1">Alamat wajib diisi</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#001524]/10 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-bold text-[#001524] mb-2">
                  Lokasi Pengambilan
                </h2>
                <p className="text-xs text-[#6E7E8D] leading-relaxed">
                  Gerai BagDaily: Jl. UMKM Kreatif No. 24, Jakarta Selatan. Bawa bukti
                  order setelah status berubah menjadi &quot;Siap Diambil/Dikemas&quot;.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[#001524]/10 bg-white p-5 shadow-sm space-y-4 sticky top-24">
              <h2 className="text-sm font-bold text-[#001524] border-b border-[#001524]/10 pb-3">
                Ringkasan Belanja
              </h2>

              <div className="max-h-60 overflow-y-auto space-y-2.5 divide-y divide-[#001524]/5">
                {items.map(item => (
                  <div
                    key={item.product.id}
                    className="pt-2 flex justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#001524]">{item.product.name}</p>
                      <p className="text-[#6E7E8D]">
                        {item.quantity} × {formatRupiah(item.product.price)}
                      </p>
                    </div>
                    <span className="font-bold text-[#001524]">
                      {formatRupiah(item.quantity * item.product.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#001524]/10 pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6E7E8D]">Subtotal Produk</span>
                  <span className="font-semibold text-[#001524]">
                    {formatRupiah(subtotal())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E7E8D]">
                    Ongkir (
                    {deliveryMethod === 'pickup'
                      ? 'Ambil di Toko'
                      : `${selectedCourier} - ${selectedZone}`}
                    )
                  </span>
                  <span className="font-semibold text-[#001524]">
                    {formatRupiah(shippingCost)}
                  </span>
                </div>
                <div className="border-t border-[#001524]/10 pt-2 flex justify-between text-sm font-bold text-[#001524]">
                  <span>Total Tagihan</span>
                  <span className="text-base text-[#15616D]">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                variant="teal"
                size="lg"
                className="w-full"
                disabled={
                  createOrder.isPending || (deliveryMethod === 'shipping' && !currentRate)
                }
              >
                {createOrder.isPending
                  ? 'Menyiapkan pembayaran…'
                  : 'Lanjut ke pembayaran'}
              </Button>
              {deliveryMethod === 'shipping' && !currentRate && (
                <p className="text-xs text-[#805448]" role="status">
                  {rates.isLoading
                    ? 'Memuat tarif pengiriman…'
                    : 'Tarif pengiriman belum tersedia. Coba lagi atau pilih ambil di toko.'}
                  {!rates.isLoading && (
                    <button
                      type="button"
                      className="underline ml-1"
                      onClick={() => void rates.refetch()}
                    >
                      Coba lagi
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
