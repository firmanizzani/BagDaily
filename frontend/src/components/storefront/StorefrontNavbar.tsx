import { BrandLogo } from '@/components/shared/BrandLogo';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useUser } from '@/hooks/api';
import { ProfileMenu } from '@/components/storefront/ProfileMenu';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useCartStore } from '@/stores/cartStore';
export function StorefrontNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const {
    data: user,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch: retrySession,
  } = useUser();
  const total = useCartStore(s => s.totalItems());
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname === '/' ? location.hash : '';
  const homeActive =
    location.pathname === '/' && section !== '#testimoni' && section !== '#faq';
  return (
    <header className="shop-header">
      <div className="shop-width shop-nav">
        <Link to="/" className="brand">
          <BrandLogo />
        </Link>
        <nav className="desktop-links">
          <Link
            to="/"
            className={homeActive ? 'active' : undefined}
            aria-current={homeActive ? 'page' : undefined}
          >
            Beranda
          </Link>
          <NavLink to="/catalog">Produk</NavLink>
          <div className="category-menu">
            <button>
              Kategori <ChevronDown size={13} />
            </button>
            <div className="category-dropdown">
              <Link to="/catalog?category=tas-ransel">Tas Ransel</Link>
              <Link to="/catalog?category=tas-selempang">Tas Selempang</Link>
              <Link to="/catalog?category=totebag">Totebag</Link>
            </div>
          </div>
          <Link
            to="/#testimoni"
            className={section === '#testimoni' ? 'active' : undefined}
            aria-current={section === '#testimoni' ? 'location' : undefined}
          >
            Testimoni
          </Link>
          <Link
            to="/#faq"
            className={section === '#faq' ? 'active' : undefined}
            aria-current={section === '#faq' ? 'location' : undefined}
          >
            FAQ
          </Link>
        </nav>
        <div className="nav-actions">
          <form
            className="nav-search"
            onSubmit={e => {
              e.preventDefault();
              navigate(`/catalog?search=${encodeURIComponent(search)}`);
            }}
          >
            <input
              aria-label="Cari tas"
              placeholder="Cari tas impianmu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button aria-label="Cari">
              <Search size={18} />
            </button>
          </form>
          <Link className="nav-icon" to="/wishlist" aria-label="Produk favorit">
            <Heart size={22} />
          </Link>
          <Link
            className="nav-icon cart-nav"
            to="/cart"
            aria-label={`Keranjang, ${total} produk`}
          >
            <ShoppingCart size={23} />
            {total > 0 && <span>{total}</span>}
          </Link>
          {sessionLoading || sessionError ? (
            <div className="profile-menu-root">
              <button
                type="button"
                className="profile-trigger has-avatar nav-session-pending"
                aria-label={
                  sessionLoading ? 'Memeriksa sesi akun' : 'Coba muat ulang akun'
                }
                aria-busy={sessionLoading}
                disabled={sessionLoading}
                onClick={() => void retrySession()}
              >
                <UserAvatar />
              </button>
            </div>
          ) : user ? (
            <ProfileMenu />
          ) : (
            <Link className="nav-login" to="/login">
              Login
            </Link>
          )}
          <button
            className="nav-icon mobile-toggle"
            aria-label="Buka navigasi"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="mobile-links">
          <Link
            to="/"
            aria-current={homeActive ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            Beranda
          </Link>
          <Link to="/catalog" onClick={() => setMobileOpen(false)}>
            Semua produk
          </Link>
          <Link to="/catalog?category=tas-ransel" onClick={() => setMobileOpen(false)}>
            Ransel
          </Link>
          <Link to="/catalog?category=tas-selempang" onClick={() => setMobileOpen(false)}>
            Selempang
          </Link>
          <Link to="/catalog?category=totebag" onClick={() => setMobileOpen(false)}>
            Totebag
          </Link>
          <Link
            to="/#testimoni"
            aria-current={section === '#testimoni' ? 'location' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            Testimoni
          </Link>
          <Link
            to="/#faq"
            aria-current={section === '#faq' ? 'location' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            FAQ
          </Link>
          <Link to="/customer/orders" onClick={() => setMobileOpen(false)}>
            Pesanan saya
          </Link>
          <Link to={user ? '/profile' : '/login'} onClick={() => setMobileOpen(false)}>
            {user ? 'Pengaturan akun' : 'Masuk / Daftar'}
          </Link>
        </nav>
      )}
    </header>
  );
}
