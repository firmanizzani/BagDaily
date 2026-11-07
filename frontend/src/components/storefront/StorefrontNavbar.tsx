import { BrandLogo } from '@/components/shared/BrandLogo';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Search, ShoppingCart } from 'lucide-react';
import { useUser } from '@/hooks/api';
import { ProfileMenu } from '@/components/storefront/ProfileMenu';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useCartStore } from '@/stores/cartStore';
export function StorefrontNavbar() {
  const [search, setSearch] = useState('');
  const {
    data: user,
    isLoading: sessionLoading,
  } = useUser();
  const total = useCartStore(s => s.totalItems());
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname === '/' ? location.hash : '';
  const homeActive =
    location.pathname === '/' && section !== '#testimoni' && section !== '#faq';
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/catalog?search=${encodeURIComponent(search.trim())}`);
  };
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
          <form className="nav-search" onSubmit={submitSearch}>
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
          {user ? (
            <ProfileMenu />
          ) : sessionLoading ? (
            <div className="profile-menu-root">
              <button
                type="button"
                className="profile-trigger has-avatar nav-session-pending"
                aria-label="Memeriksa sesi akun"
                aria-busy="true"
                disabled
              >
                <UserAvatar />
              </button>
            </div>
          ) : (
            <Link className="nav-login" to="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
