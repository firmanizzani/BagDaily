import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Copy, Search, Store, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Order } from '@/types/api';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { orderStatusLabel } from '@/lib/orders';
import {
  customerOrderAction,
  customerOrderFilters,
  customerOrderTone,
} from '@/lib/customerOrders';

export function CustomerOrdersPage() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const settledSearch = useDebouncedValue(search);
  const receive = useAction<Order>();
  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
    tab,
    ...(settledSearch.trim() ? { search: settledSearch.trim() } : {}),
  });
  const {
    data: ordersData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useApi<Order[]>(`/orders/my?${params}`);
  const orders = ordersData?.data || [];
  const pagination = ordersData?.pagination;
  const filtered = tab !== 'all' || Boolean(search.trim());

  const confirmReceived = async (order: Order) => {
    if (
      receive.isPending ||
      customerOrderAction(order) !== 'receive' ||
      !window.confirm(
        order.deliveryMethod === 'pickup'
          ? 'Barang sudah diambil? Konfirmasi akan menyelesaikan pesanan dan menambahkan poin ke akun Anda.'
          : 'Barang sudah diterima? Konfirmasi akan menyelesaikan pesanan dan menambahkan poin ke akun Anda.',
      )
    )
      return;
    try {
      const result = await receive.mutateAsync({
        path: `/orders/${order.id}/receive`,
        method: 'POST',
      });
      toast.success(
        `Pesanan selesai. ${(result.data.pointsEarned ?? 0).toLocaleString('id-ID')} poin masuk ke akun Anda.`,
      );
    } catch {
      /* Error feedback is handled by useAction. */
    }
  };

  const copyNumber = async (order: Order) => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(order.id);
      toast.success('Nomor pesanan disalin.');
    } catch {
      toast.error('Nomor belum dapat disalin. Silakan salin teks nomor pesanan.');
    }
  };

  return (
    <div className="customer-orders-page">
      <header className="customer-orders-heading">
        <h1>Pesanan saya</h1>
        <p>Lihat pembelian dan ikuti perjalanan pesananmu.</p>
      </header>
      <div className="customer-orders-tools">
        <label className="customer-order-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Cari nomor pesanan"
            placeholder="Cari nomor pesanan…"
            value={search}
            maxLength={100}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          className="customer-order-filter"
          aria-label="Filter status pesanan"
          value={tab}
          onChange={event => {
            setTab(event.target.value);
            setPage(1);
          }}
        >
          {customerOrderFilters.map(item => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div aria-busy={isFetching}>
        {isLoading ? (
          <LoadingState label="Memuat riwayat pesanan…" />
        ) : isError ? (
          <ErrorState
            message="Gagal memuat daftar pesanan."
            onRetry={() => void refetch()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title={filtered ? 'Tidak ada pesanan yang cocok' : 'Belum ada pesanan'}
            description={
              filtered
                ? 'Coba nomor lain atau pilih status pesanan yang berbeda.'
                : 'Temukan tas untuk menemani aktivitasmu sehari-hari.'
            }
            action={filtered ? undefined : 'Mulai belanja'}
            to={filtered ? undefined : '/catalog'}
          />
        ) : (
          <div className="customer-order-list">
            {orders.map(order => {
              const action = customerOrderAction(order);
              const name = order.productName || 'Produk pesanan';
              return (
                <article className="customer-order-card" key={order.id}>
                  <header>
                    <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
                    <span
                      className={`customer-order-status ${customerOrderTone(order.status)}`}
                    >
                      <i aria-hidden="true" />
                      {orderStatusLabel(order)}
                    </span>
                  </header>
                  <div className="customer-order-reference">
                    <span>No. pesanan</span>
                    <span className="customer-order-id" title={order.orderNumber}>
                      {order.orderNumber}
                    </span>
                    <button
                      type="button"
                      aria-label={`Salin nomor pesanan ${order.orderNumber}`}
                      onClick={() => void copyNumber(order)}
                    >
                      {copied === order.id ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <Link className="customer-order-product" to={`/orders/${order.id}`}>
                    <ProductPhoto name={name} src={order.productImageUrl} />
                    <div>
                      <h2>{name}</h2>
                      {(order.productCount ?? 0) > 1 && (
                        <p>+{order.productCount! - 1} produk lainnya</p>
                      )}
                      {order.totalQuantity != null && (
                        <span>
                          {order.totalQuantity} barang
                          {(order.productCount ?? 0) > 1
                            ? ` · ${order.productCount} jenis produk`
                            : ''}
                        </span>
                      )}
                      <small>
                        {order.channel === 'pos' || order.deliveryMethod === 'pickup' ? (
                          <Store size={14} />
                        ) : (
                          <Truck size={14} />
                        )}
                        {order.channel === 'pos'
                          ? 'Pembelian di toko'
                          : order.deliveryMethod === 'pickup'
                            ? 'Ambil di toko'
                            : `Pengiriman${order.courier ? ` · ${order.courier}` : ''}`}
                      </small>
                    </div>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <footer>
                    <div className="customer-order-total">
                      <span>Total pembayaran</span>
                      <strong>{formatRupiah(order.total)}</strong>
                    </div>
                    <div className="customer-order-actions">
                      {action !== 'view' && (
                        <Link
                          className="customer-order-detail"
                          to={`/orders/${order.id}`}
                        >
                          Lihat pesanan
                        </Link>
                      )}
                      {action === 'receive' ? (
                        <Button
                          variant="teal"
                          disabled={receive.isPending}
                          onClick={() => void confirmReceived(order)}
                        >
                          {receive.isPending &&
                          receive.variables?.path === `/orders/${order.id}/receive`
                            ? 'Menyelesaikan…'
                            : order.deliveryMethod === 'pickup'
                              ? 'Konfirmasi diambil'
                              : 'Konfirmasi diterima'}
                        </Button>
                      ) : (
                        <Button asChild variant={action === 'pay' ? 'teal' : 'outline'}>
                          <Link to={`/orders/${order.id}`}>
                            {action === 'pay' ? 'Bayar sekarang' : 'Lihat pesanan'}
                            <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <nav className="customer-orders-pagination" aria-label="Halaman pesanan">
          <Button
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage(value => Math.max(1, value - 1))}
          >
            Sebelumnya
          </Button>
          <span>
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages || isFetching}
            onClick={() => setPage(value => value + 1)}
          >
            Selanjutnya
          </Button>
        </nav>
      )}
    </div>
  );
}
