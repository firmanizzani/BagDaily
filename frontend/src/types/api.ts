export type Role = 'pelanggan' | 'kasir' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  material: string;
  price: number;
  stock: number;
  minimumStock: number;
  imagePath: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export type OrderChannel = 'online' | 'pos';

export type OrderStatus =
  | 'awaiting_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid';

export type DeliveryMethod = 'shipping' | 'pickup';

export type PaymentMethod = 'bank_transfer' | 'qris' | 'cash' | 'debit' | 'credit';

export type Courier = 'JNE' | 'J&T' | 'SiCepat';

export type ShippingZone = 'Jabodetabek' | 'Jawa' | 'Luar Jawa';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  cashierId: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  courier: Courier | null;
  shippingZone: ShippingZone | null;
  shippingAddress: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  trackingNumber: string | null;
  paymentDeadline: string | null;
  paidAt: string | null;
  cashReceived: number | null;
  changeAmount: number | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  history?: OrderStatusHistoryItem[];
  cashierName?: string | null;
}

export interface ShippingRate {
  id: string;
  courier: Courier;
  zone: ShippingZone;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'sale' | 'restock' | 'correction' | 'reversal';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes: string | null;
  referenceOrderId: string | null;
  createdBy: string | null;
  createdAt: string;
  productName?: string;
  productSku?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface DashboardOverview {
  totalProductsSold: number;
  newCustomers: number;
  totalSales: number;
  totalTransactions: number;
  activeProducts: number;
  lowStockProducts: number;
  onlineSales: number;
  posSales: number;
}

export interface SalesTrendItem {
  date: string;
  revenue: number;
  transactions: number;
}

export interface CategorySalesItem {
  categoryId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface TopProductItem {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface ChannelSalesItem {
  channel: OrderChannel;
  revenue: number;
  transactions: number;
}

export interface RestockRecommendation {
  productId: string;
  name: string;
  stock: number;
  minimumStock: number;
  soldLast7Days: number;
  averageDailySales: number;
  next7DaysDemand: number;
  recommendedQuantity: number;
}

export interface SalesReportSummary {
  totalSales: number;
  totalTransactions: number;
  onlineSales: number;
  posSales: number;
}

export interface SalesReportData {
  summary: SalesReportSummary;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}
