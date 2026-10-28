import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Backpack,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import { useUser } from '@/hooks/api';
import { useLogout } from '@/features/auth/useAuth';
import { LoadingState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
export function StaffLayout({ allowedRoles }: { allowedRoles: ('admin' | 'kasir')[] }) {
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  if (isLoading) return <LoadingState label="Memeriksa sesi…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(user.role as 'admin' | 'kasir'))
    return (
      <div className="wishlist-empty">
        <h1>Akses terbatas</h1>
        <p>Akun ini tidak memiliki akses ke panel staf.</p>
        <Button asChild>
          <Link to="/">Kembali ke toko</Link>
        </Button>
      </div>
    );
  const admin = user.role === 'admin';
  const links = admin
    ? [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/products', icon: ShoppingBag, label: 'Produk' },
        { to: '/cashier/orders', icon: Package, label: 'Pesanan' },
        { to: '/admin/reports', icon: BarChart3, label: 'Laporan' },
      ]
    : [
        { to: '/pos', icon: Store, label: 'Kasir' },
        { to: '/cashier/products', icon: ShoppingBag, label: 'Produk' },
        { to: '/cashier/orders', icon: Package, label: 'Pesanan online' },
        { to: '/cashier/history', icon: Clock3, label: 'Transaksi' },
      ];
  const productPaths = ['/admin/products', '/admin/categories', '/admin/inventory'];
  const settingsPaths = ['/admin/settings', '/admin/users', '/admin/shipping'];
  const productSection = admin && productPaths.includes(location.pathname);
  const settingsSection = admin && settingsPaths.includes(location.pathname);
  const current =
    location.pathname === '/pos'
      ? 'Kasir'
      : productSection
        ? 'Produk'
        : settingsSection
          ? 'Pengaturan'
          : links.find(l => l.to === location.pathname)?.label ||
            (location.pathname.endsWith('settings') ? 'Pengaturan' : 'Detail pesanan');
  return (
    <div className="staff-shell">
      <button
        className={`sidebar-scrim ${open ? 'shown' : ''}`}
        aria-label="Tutup navigasi"
        onClick={() => setOpen(false)}
      />
      <aside className={`staff-sidebar ${open ? 'open' : ''}`}>
        <Link className="brand" to="/">
          <Backpack size={29} strokeWidth={1.6} />
          <span>
            BagDaily<span className="brand-dot">.</span>
          </span>
        </Link>
        <p className="workspace-label">
          {admin ? 'Ruang pengelola' : 'Operasional toko'}
        </p>
        <nav>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                isActive ||
                (to === '/admin/products' && productSection) ||
                (to === '/cashier/orders' &&
                  location.pathname.startsWith('/cashier/orders/'))
                  ? 'active'
                  : ''
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              <ChevronRight className="active-chevron" size={14} />
            </NavLink>
          ))}
          <NavLink
            to={admin ? '/admin/settings' : '/cashier/settings'}
            className={({ isActive }) => (isActive || settingsSection ? 'active' : '')}
            onClick={() => setOpen(false)}
          >
            <Settings size={19} strokeWidth={1.7} />
            <span>Pengaturan</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          {admin && (
            <Link className="visit-store" to="/pos">
              <Store size={17} /> Buka kasir <ChevronRight size={15} />
            </Link>
          )}
          <Link className="visit-store" to="/">
            <Store size={17} /> Lihat toko online <ChevronRight size={15} />
          </Link>
          <div className="staff-account">
            <span className="staff-avatar">{user.name.charAt(0)}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{admin ? 'Administrator' : 'Kasir toko'}</span>
            </div>
            <button aria-label="Keluar akun" onClick={() => logout.mutate()}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="staff-workspace">
        <header className="staff-topbar">
          <div>
            <button
              className="mobile-toggle"
              aria-label="Buka navigasi staf"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="breadcrumb-root">
              {admin ? 'Admin' : 'Toko'} <ChevronRight size={14} />
            </span>
            <strong>{current}</strong>
          </div>
          <div>
            <span className="system-status">
              <i /> Stok tersinkronisasi
            </span>
            <span className="topbar-date">
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }).format(new Date())}
            </span>
            <Link
              to={admin ? '/admin/settings' : '/cashier/settings'}
              className="staff-avatar"
              aria-label="Pengaturan akun"
            >
              {user.name.charAt(0)}
            </Link>
          </div>
        </header>
        <main className="staff-content">
          {(productSection || settingsSection) && (
            <nav
              className="staff-section-tabs"
              aria-label={productSection ? 'Pengelolaan produk' : 'Pengaturan toko'}
            >
              {(productSection
                ? [
                    { to: '/admin/products', label: 'Daftar produk' },
                    { to: '/admin/categories', label: 'Kategori' },
                    { to: '/admin/inventory', label: 'Inventaris & stok' },
                  ]
                : [
                    { to: '/admin/settings', label: 'Akun admin' },
                    { to: '/admin/users', label: 'Pengguna & kasir' },
                    { to: '/admin/shipping', label: 'Pengiriman' },
                  ]
              ).map(tab => (
                <NavLink key={tab.to} to={tab.to}>
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
