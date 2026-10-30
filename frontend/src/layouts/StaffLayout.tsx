import { UserAvatar } from '@/components/shared/UserAvatar';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Search,
  Store,
  UsersRound,
  X,
} from 'lucide-react';
import { useUser } from '@/hooks/api';
import { useLogout } from '@/features/auth/useAuth';
import { LoadingState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { formatShortDate } from '@/lib/utils';
export function StaffLayout({ allowedRoles }: { allowedRoles: ('admin' | 'kasir')[] }) {
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
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
        { to: '/admin/orders', icon: Package, label: 'Pesanan' },
        { to: '/admin/customers', icon: UsersRound, label: 'Pelanggan' },
        { to: '/admin/reports', icon: BarChart3, label: 'Laporan' },
      ]
    : [
        { to: '/pos', icon: Store, label: 'Kasir' },
        { to: '/cashier/products', icon: ShoppingBag, label: 'Produk' },
        { to: '/cashier/history', icon: Clock3, label: 'Transaksi' },
      ];
  const productPaths = ['/admin/products', '/admin/categories', '/admin/inventory'];
  const settingsPaths = ['/admin/settings', '/admin/users', '/admin/shipping'];
  const productSection = admin && productPaths.includes(location.pathname);
  const settingsSection = admin && settingsPaths.includes(location.pathname);
  const current =
    location.pathname === '/pos'
      ? 'Kasir'
      : location.pathname.startsWith('/admin/customers/')
        ? 'Transaksi pelanggan'
        : productSection
          ? 'Produk'
          : settingsSection
            ? 'Pengaturan'
            : links.find(l => l.to === location.pathname)?.label ||
              (location.pathname.endsWith('settings') ? 'Pengaturan' : 'Detail pesanan');
  return (
    <div className={`staff-shell ${admin ? 'admin-shell' : ''}`}>
      <button
        className={`sidebar-scrim ${open ? 'shown' : ''}`}
        aria-label="Tutup navigasi"
        onClick={() => setOpen(false)}
      />
      <aside className={`staff-sidebar ${open ? 'open' : ''}`}>
        <Link className="brand" to="/">
          <BrandLogo />
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
                (to === '/admin/orders' &&
                  location.pathname.startsWith('/admin/orders/')) ||
                (to === '/admin/customers' &&
                  location.pathname.startsWith('/admin/customers/'))
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
            <UserAvatar src={user.avatarUrl} className="staff-avatar" />
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
            {admin && (
              <div className="admin-global-search">
                <Search size={16} />
                <input
                  aria-label="Cari di panel admin"
                  placeholder="Cari pesanan, produk, pelanggan…"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
                {search.trim() && (
                  <div className="admin-search-destinations">
                    {[
                      { to: '/admin/orders', label: 'pesanan' },
                      { to: '/admin/products', label: 'produk' },
                      { to: '/admin/customers', label: 'pelanggan' },
                    ].map(item => (
                      <Link
                        key={item.to}
                        to={item.to + '?search=' + encodeURIComponent(search.trim())}
                        onClick={() => setSearch('')}
                      >
                        Cari {item.label}: <strong>{search}</strong>
                        <ChevronRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              {formatShortDate(new Date().toISOString())}
            </span>
            <Link
              to={admin ? '/admin/settings' : '/cashier/settings'}
              className="staff-avatar"
              aria-label="Pengaturan akun"
            >
              <UserAvatar src={user.avatarUrl} />
            </Link>
          </div>
        </header>
        <main className="staff-content">
          {settingsSection && (
            <header className="admin-page-heading">
              <div>
                <h1>Pengaturan</h1>
                <p>Kelola akun, akses pengguna, dan pengiriman toko.</p>
              </div>
            </header>
          )}
          <div className={settingsSection ? 'admin-settings-layout' : undefined}>
            {(productSection || settingsSection) && (
              <nav
                className={settingsSection ? 'admin-settings-nav' : 'staff-section-tabs'}
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
            <div className={settingsSection ? 'admin-settings-content' : undefined}>
              <Outlet key={location.key} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
