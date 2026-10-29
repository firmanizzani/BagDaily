import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Settings,
  Store,
  UserRound,
} from 'lucide-react';
import { useUser } from '@/hooks/api';
import { useLogout } from '@/features/auth/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const close = () => setOpen(false);
  const entries = [
    { to: '/profile', icon: UserRound, label: 'Profil saya' },
    {
      to: user?.role === 'pelanggan' ? '/customer/orders' : '/cashier/orders',
      icon: Package,
      label: user?.role === 'pelanggan' ? 'Pesanan saya' : 'Pesanan toko',
    },
    { to: '/addresses', icon: MapPin, label: 'Alamat pengiriman' },
    { to: '/account/settings', icon: Settings, label: 'Pengaturan akun' },
  ];
  return (
    <div
      className="profile-menu-root"
      ref={root}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <button
        ref={trigger}
        className={`profile-trigger ${open ? 'is-open' : ''} ${user ? 'has-avatar' : ''}`}
        aria-label="Buka menu profil"
        aria-expanded={open}
        aria-controls={id}
        disabled={isLoading}
        onClick={() => setOpen(!open)}
      >
        {user ? <UserAvatar src={user.avatarUrl} /> : <UserRound size={23} />}
      </button>
      {open && (
        <div className="profile-dropdown" id={id}>
          <div className="profile-menu-heading">
            <UserAvatar src={user?.avatarUrl} className="profile-menu-avatar" />
            <div>
              <strong>
                {user ? `Halo, ${user.name.split(' ')[0]}!` : 'Halo, teman BagDaily!'}
              </strong>
              <p>{user ? user.email : 'Satu akun untuk setiap langkahmu.'}</p>
            </div>
          </div>
          {user ? (
            <>
              <nav aria-label="Menu akun">
                {user.role === 'admin' && (
                  <Link className="profile-workspace" to="/admin" onClick={close}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard admin</span>
                    <ChevronRight size={15} />
                  </Link>
                )}
                {user.role === 'kasir' && (
                  <Link className="profile-workspace" to="/pos" onClick={close}>
                    <Store size={20} />
                    <span>Buka kasir</span>
                    <ChevronRight size={15} />
                  </Link>
                )}
                {entries.map(({ to, icon: Icon, label }) => (
                  <Link
                    className={location.pathname === to ? 'current' : ''}
                    key={to}
                    to={to}
                    onClick={close}
                  >
                    <Icon size={20} strokeWidth={1.7} />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
              <div className="profile-menu-bottom">
                <button
                  disabled={logout.isPending}
                  onClick={() =>
                    logout.mutate(undefined, {
                      onSuccess: () => {
                        close();
                        navigate('/');
                        trigger.current?.focus();
                      },
                    })
                  }
                >
                  <LogOut size={20} strokeWidth={1.7} />
                  <span>{logout.isPending ? 'Keluar…' : 'Keluar'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="guest-account-actions">
                <Link className="shop-button" to="/login" onClick={close}>
                  Masuk ke akun <ChevronRight size={16} />
                </Link>
                <Link className="guest-register" to="/register" onClick={close}>
                  Belum punya akun? <strong>Daftar sekarang</strong>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
