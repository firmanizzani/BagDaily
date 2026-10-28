import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Heart, MapPin, Package, Settings, UserRound, ChevronRight } from 'lucide-react';
import { useUser } from '@/hooks/api';
import { LoadingState } from '@/components/shared/states';
export function AccountLayout() {
  const user = useUser();
  const location = useLocation();
  if (user.isLoading) return <LoadingState label="Menyiapkan akunmu…" />;
  if (!user.data)
    return (
      <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />
    );
  return (
    <div className="account-layout shop-width">
      <aside className="account-sidebar">
        <div className="account-identity">
          <span>
            <UserRound size={26} strokeWidth={1.4} />
          </span>
          <div>
            <strong>Halo, {user.data.name.split(' ')[0]}!</strong>
            <p>{user.data.email}</p>
          </div>
        </div>
        <nav>
          {[
            { to: '/profile', icon: UserRound, label: 'Profil saya' },
            {
              to: user.data.role === 'pelanggan' ? '/customer/orders' : '/cashier/orders',
              icon: Package,
              label: user.data.role === 'pelanggan' ? 'Pesanan saya' : 'Pesanan toko',
            },
            { to: '/wishlist', icon: Heart, label: 'Favorit saya' },
            { to: '/addresses', icon: MapPin, label: 'Alamat pengiriman' },
            { to: '/account/settings', icon: Settings, label: 'Pengaturan akun' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink to={to} key={to}>
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </NavLink>
          ))}
        </nav>
        <p className="account-help">Teman setia untuk setiap langkahmu.</p>
      </aside>
      <div className="account-content">
        <Outlet />
      </div>
    </div>
  );
}
