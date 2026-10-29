import { BrandLogo } from '@/components/shared/BrandLogo';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useUser } from '@/hooks/api';
import { ProfileMenu } from '@/components/storefront/ProfileMenu';
import { useCartStore } from '@/stores/cartStore';
export function StorefrontNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: user } = useUser();
  const total = useCartStore(s => s.totalItems());
  const navigate = useNavigate();
  return (
    <header className="shop-header">
      <div className="shop-width shop-nav">
        <Link to="/" className="brand">
          <BrandLogo />
        </Link>
        <nav className="desktop-links">
          <NavLink to="/" end>
            Beranda
          </NavLink>
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
          <a href="/#tentang">Tentang kami</a>
          <a href="#kontak">Kontak</a>
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
          <ProfileMenu />
          {!user && (
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
          <Link to="/" onClick={() => setMobileOpen(false)}>
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
