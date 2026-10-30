import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useAdminProducts,
  useProducts,
  useUpdateProduct,
  useCreateCategory,
  useUpdateCategory,
} from './features/products/useProducts';
import { useLogin, useLogout, useUpdateProfile } from './features/auth/useAuth';
import { loginDestination } from './features/auth/loginDestination';
import { useUpdateShippingRate } from './features/checkout/useCheckout';
import { useSalesReport } from './features/analytics/useAnalytics';
import { request } from './services/apiClient';

const captureQuery = vi.hoisted(() =>
  vi.fn((options: { queryFn: () => unknown }) => options),
);
const captureMutation = vi.hoisted(() =>
  vi.fn(
    (options: {
      mutationFn: (input: never) => unknown;
      onSuccess?: (response: never) => unknown;
    }) => options,
  ),
);

const sessionClient = vi.hoisted(() => ({
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: captureQuery,
  useMutation: captureMutation,
  useQueryClient: () => sessionClient,
}));

vi.mock('./services/apiClient', () => ({
  request: vi.fn().mockResolvedValue({ data: [] }),
  ApiError: class extends Error {},
}));
import { formatRupiah, formatDate } from './lib/utils';
import {
  nextStatus,
  nextStatusAction,
  orderStatusLabel,
  statusLabels,
} from './lib/orders';
import { useCartStore } from './features/cart/cartStore';
import { usePosStore } from './features/pos/posStore';
import type { Product } from './types/api';

const mockProduct: Product = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  categoryId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  sku: 'BD-SL-001',
  name: 'Arlo Crossbody',
  slug: 'arlo-crossbody',
  description: 'Kotak kecil satu resleting nilon hitam',
  material: 'Nilon Hitam',
  price: 159000,
  stock: 12,
  minimumStock: 5,
  imagePath: null,
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('API hook contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([useProducts, useAdminProducts])(
    'maps product filters to backend query names',
    async useHook => {
      useHook({ categoryId: mockProduct.categoryId, limit: 8, offset: 16 });
      await captureQuery.mock.calls.at(-1)![0].queryFn();
      const path = vi.mocked(request).mock.calls.at(-1)![0];
      const params = new URLSearchParams(path.split('?')[1]);
      expect(params.get('category')).toBe(mockProduct.categoryId);
      expect(params.get('limit')).toBe('8');
      expect(params.get('page')).toBe('3');
      expect(params.has('offset')).toBe(false);
    },
  );

  it.each([
    [useUpdateProfile, { name: 'Customer' }, '/auth/profile'],
    [
      useUpdateProduct,
      { id: 'product', body: { name: 'Bag' } },
      '/admin/products/product',
    ],
    [
      useUpdateCategory,
      { id: 'category', body: { name: 'Bags', slug: 'bags' } },
      '/admin/categories/category',
    ],
    [
      useUpdateShippingRate,
      { id: 'rate', body: { rate: 10000 } },
      '/admin/shipping/rates/rate',
    ],
  ] as const)('uses PATCH for backend update routes', async (useHook, input, path) => {
    useHook();
    await captureMutation.mock.calls.at(-1)![0].mutationFn(input as never);
    expect(request).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('creates categories with required slug', async () => {
    useCreateCategory();
    const body = { name: 'Bags', slug: 'bags' };
    await captureMutation.mock.calls.at(-1)![0].mutationFn(body as never);
    expect(request).toHaveBeenCalledWith('/admin/categories', { method: 'POST', body });
  });

  it('sends report date filters as from and to', async () => {
    useSalesReport('2026-01-01', '2026-02-01');
    await captureQuery.mock.calls.at(-1)![0].queryFn();
    expect(request).toHaveBeenCalledWith(
      '/admin/reports/sales?from=2026-01-01&to=2026-02-01',
    );
  });
});

describe('Utility formatting', () => {
  it('formats Rupiah currency cleanly', () => {
    const formatted = formatRupiah(159000);
    expect(formatted).toContain('159.000');
  });

  it('formats ISO dates', () => {
    const formatted = formatDate('2026-05-15T10:30:00Z');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });
});

describe('Order state transitions', () => {
  it('follows shipping flow awaiting_confirmation -> packed -> shipped -> completed', () => {
    expect(
      nextStatus({ status: 'awaiting_confirmation', deliveryMethod: 'shipping' }),
    ).toBe('packed');
    expect(nextStatus({ status: 'confirmed', deliveryMethod: 'shipping' })).toBe(
      'packed',
    );
    expect(nextStatus({ status: 'packed', deliveryMethod: 'shipping' })).toBe('shipped');
    expect(nextStatus({ status: 'shipped', deliveryMethod: 'shipping' })).toBe(
      'completed',
    );
  });

  it('follows pickup flow packed -> completed without shipped state', () => {
    expect(
      nextStatus({ status: 'awaiting_confirmation', deliveryMethod: 'pickup' }),
    ).toBe('packed');
    expect(nextStatus({ status: 'packed', deliveryMethod: 'pickup' })).toBe('completed');
  });

  it.each([
    ['awaiting_confirmation', 'shipping', 'Proses pesanan'],
    ['awaiting_confirmation', 'pickup', 'Siap diambil'],
    ['confirmed', 'shipping', 'Proses pesanan'],
    ['packed', 'shipping', 'Kirim pesanan'],
    ['packed', 'pickup', 'Sudah diambil'],
    ['shipped', 'shipping', 'Selesaikan pesanan'],
    ['awaiting_payment', 'shipping', null],
    ['completed', 'pickup', null],
    ['cancelled', 'shipping', null],
  ] as const)(
    'labels %s / %s with its cashier action',
    (status, deliveryMethod, expected) => {
      expect(nextStatusAction({ status, deliveryMethod })).toBe(expected);
    },
  );

  it('shows readiness according to the delivery method', () => {
    expect(orderStatusLabel({ status: 'packed', deliveryMethod: 'pickup' })).toBe(
      'Siap diambil',
    );
    expect(orderStatusLabel({ status: 'packed', deliveryMethod: 'shipping' })).toBe(
      'Siap dikirim',
    );
  });

  it('provides Indonesian status labels', () => {
    expect(statusLabels.awaiting_payment).toBe('Menunggu pembayaran');
    expect(statusLabels.completed).toBe('Selesai');
  });
});

describe('Cart stores independence and rules', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    usePosStore.getState().resetSale();
  });

  it('customer cart adds, updates quantity, and computes subtotal without touching stock', () => {
    const cart = useCartStore.getState();
    cart.addItem(mockProduct, 2);

    expect(useCartStore.getState().totalItems()).toBe(2);
    expect(useCartStore.getState().subtotal()).toBe(318000);

    useCartStore.getState().updateQuantity(mockProduct.id, 3);
    expect(useCartStore.getState().totalItems()).toBe(3);
    expect(useCartStore.getState().subtotal()).toBe(477000);

    useCartStore.getState().removeItem(mockProduct.id);
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(mockProduct.stock).toBe(12);
  });

  it('cashier POS store manages cash, subtotal, and change independently', () => {
    const pos = usePosStore.getState();
    pos.addItem(mockProduct, 1);
    expect(pos.subtotal()).toBe(159000);

    pos.setCashReceived(200000);
    expect(usePosStore.getState().changeAmount()).toBe(41000);

    pos.resetSale();
    expect(usePosStore.getState().items.length).toBe(0);
    expect(usePosStore.getState().cashReceived).toBe(0);
  });
});

describe('stock limits in shopping carts', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    usePosStore.getState().resetSale();
  });
  it.each([useCartStore, usePosStore])(
    'prevents overselling through repeated additions and quantity changes',
    store => {
      const product = { ...mockProduct, stock: 2 };
      store.getState().addItem(product, 2);
      store.getState().addItem(product, 1);
      expect(store.getState().items[0]?.quantity).toBe(2);
      store.getState().updateQuantity(product.id, 99);
      expect(store.getState().items[0]?.quantity).toBe(2);
    },
  );
  it.each([useCartStore, usePosStore])(
    'ignores products that are out of stock',
    store => {
      store.getState().addItem({ ...mockProduct, stock: 0 });
      expect(store.getState().items).toHaveLength(0);
    },
  );
});

describe('POS receipts', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { PosReceipt } = await import('./components/cashier/PosReceipt');
  const order = {
    orderNumber: 'BD-TEST',
    createdAt: '2026-10-29T10:00:00Z',
    cashierName: 'Test Cashier',
    paymentStatus: 'paid',
    subtotal: 318000,
    total: 318000,
    shippingCost: 0,
    cashReceived: 350000,
    changeAmount: 32000,
    items: [
      {
        id: 'item',
        productNameSnapshot: 'Long product name',
        skuSnapshot: 'SKU-1',
        quantity: 2,
        unitPrice: 159000,
        subtotal: 318000,
      },
    ],
  };
  it.each([
    ['cash', 'Tunai'],
    ['qris', 'QRIS'],
    ['bank_transfer', 'Transfer Bank'],
    ['debit', 'Kartu Debit'],
    ['credit', 'Kartu Kredit'],
  ] as const)(
    'prints %s with correct currency and cash details',
    (paymentMethod, label) => {
      const html = renderToStaticMarkup(
        createElement(PosReceipt, {
          order: { ...order, paymentMethod } as import('./types/api').Order,
        }),
      );
      expect(html).toContain(label);
      expect(html).toContain('159.000');
      expect(html).toContain('318.000');
      expect(html).toContain('SKU-1');
      expect(html.includes('Tunai diterima')).toBe(paymentMethod === 'cash');
      expect(html.includes('Kembalian')).toBe(paymentMethod === 'cash');
    },
  );
});

describe('Staff login navigation', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['admin', 'kasir'] as const)(
    'publishes the %s session before login resolves',
    async role => {
      useLogin();
      let finishCancellation!: () => void;
      sessionClient.cancelQueries.mockReturnValueOnce(
        new Promise<void>(resolve => {
          finishCancellation = resolve;
        }),
      );
      const user = { id: 'staff', role };
      const success = captureMutation.mock.calls.at(-1)![0].onSuccess!({
        data: user,
      } as never);
      expect(sessionClient.cancelQueries).toHaveBeenCalledWith({ queryKey: ['session'] });
      expect(sessionClient.setQueryData).not.toHaveBeenCalled();
      finishCancellation();
      await success;
      expect(sessionClient.setQueryData).toHaveBeenCalledWith(['session'], user);
    },
  );
  it('clears the cached session on logout', async () => {
    useLogout();
    await captureMutation.mock.calls.at(-1)![0].onSuccess!(undefined as never);
    expect(sessionClient.setQueryData).toHaveBeenCalledWith(['session'], null);
  });
  it.each([undefined, '/login', '/checkout', '/cashier/orders'])(
    'sends staff to their dashboard regardless of return URL %s',
    returnUrl => {
      expect(loginDestination('admin', returnUrl)).toBe('/admin');
      expect(loginDestination('kasir', returnUrl)).toBe('/pos');
    },
  );
  it('preserves customer destinations and avoids returning to authentication pages', () => {
    expect(loginDestination('pelanggan', '/checkout?step=payment')).toBe(
      '/checkout?step=payment',
    );
    for (const url of [
      '/login',
      '/login?from=/checkout',
      '/register',
      '//example.com',
      'https://example.com',
    ]) {
      expect(loginDestination('pelanggan', url)).toBe('/');
    }
  });
});

describe('Online payment panel', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { OnlinePaymentPanel } =
    await import('./components/storefront/OnlinePaymentPanel');
  const defaults = {
    total: 239000,
    deadline: '2026-10-29T20:15:00Z',
    method: 'qris' as const,
    isProcessing: false,
    isExpired: false,
    onMethodChange: vi.fn(),
    onPay: vi.fn(),
  };
  it('shows QR, payable total, and payment action on the same page', () => {
    const html = renderToStaticMarkup(createElement(OnlinePaymentPanel, defaults));
    expect(html).toContain('/images/qris-demo.svg');
    expect(html).toContain('239.000');
    expect(html).toContain('Bayar sekarang');
    expect(html).toContain('tidak perlu mengirim uang');
    expect(html).not.toContain('disabled=""');
  });
  it('shows transfer details when bank transfer is selected', () => {
    const html = renderToStaticMarkup(
      createElement(OnlinePaymentPanel, { ...defaults, method: 'bank_transfer' }),
    );
    expect(html).toContain('Rekening tujuan');
    expect(html).toContain('0000 0000 0000');
    expect(html).not.toContain('/images/qris-demo.svg');
  });
  it.each([
    { isExpired: true, text: 'Waktu pembayaran habis' },
    { isProcessing: true, text: 'Memproses pembayaran' },
  ])('blocks payment when unavailable: $text', state => {
    const html = renderToStaticMarkup(
      createElement(OnlinePaymentPanel, { ...defaults, ...state }),
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain(state.text);
  });
});
