import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { StorefrontLayout } from '@/layouts/StorefrontLayout';
import { StaffLayout } from '@/layouts/StaffLayout';
import { AccountLayout } from '@/layouts/AccountLayout';
import { HomePage } from '@/pages/storefront/HomePage';
import { WishlistPage } from '@/pages/storefront/WishlistPage';
import { ShopLoginRequired } from '@/components/storefront/ShopLoginRequired';
import { CashierProductsPage } from '@/pages/cashier/CashierProductsPage';
import { CatalogPage } from '@/pages/storefront/CatalogPage';
import { ProductDetailPage } from '@/pages/storefront/ProductDetailPage';
import { CartPage } from '@/pages/storefront/CartPage';
import { CheckoutPage } from '@/pages/storefront/CheckoutPage';
import { OrderDetailPage } from '@/pages/storefront/OrderDetailPage';
import { CustomerOrdersPage } from '@/pages/storefront/CustomerOrdersPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProfilePage } from '@/pages/auth/ProfilePage';
import { PosPage } from '@/pages/cashier/PosPage';
import { StaffOrdersPage } from '@/pages/cashier/StaffOrdersPage';
import { StaffOrderDetailPage } from '@/pages/cashier/StaffOrderDetailPage';
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminInventoryPage } from '@/pages/admin/AdminInventoryPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminShippingPage } from '@/pages/admin/AdminShippingPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { ErrorState, LoadingState } from '@/components/shared/states';

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then(module => ({
    default: module.AdminDashboardPage,
  })),
);

function NotFoundPage() {
  return (
    <div className="page-container">
      <ErrorState message="Halaman tidak ditemukan." />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState label="Menyiapkan halaman…" />}>
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route element={<ShopLoginRequired />}>
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="cart" element={<CartPage />} />
          </Route>
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="orders/:id/pay" element={<OrderDetailPage paymentOnly />} />
          <Route element={<AccountLayout />}>
            <Route path="customer/orders" element={<CustomerOrdersPage />} />
            <Route path="profile" element={<ProfilePage section="profile" />} />
            <Route path="addresses" element={<ProfilePage section="address" />} />
            <Route path="account/settings" element={<ProfilePage section="settings" />} />
          </Route>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route element={<StaffLayout allowedRoles={['kasir', 'admin']} />}>
          <Route path="pos" element={<PosPage />} />
          <Route path="cashier/products" element={<CashierProductsPage />} />
          <Route path="cashier/settings" element={<ProfilePage />} />
          <Route path="cashier/orders" element={<StaffOrdersPage />} />
          <Route path="cashier/orders/:id" element={<StaffOrderDetailPage />} />
          <Route path="cashier/history" element={<StaffOrdersPage history />} />
          <Route path="cashier/receipt/:id" element={<StaffOrderDetailPage receipt />} />
        </Route>
        <Route element={<StaffLayout allowedRoles={['admin']} />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/settings" element={<ProfilePage />} />
          <Route path="admin/products" element={<AdminProductsPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/inventory" element={<AdminInventoryPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/shipping" element={<AdminShippingPage />} />
        </Route>
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
