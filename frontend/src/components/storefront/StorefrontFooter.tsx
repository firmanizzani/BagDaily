import { BrandLogo } from '@/components/shared/BrandLogo';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail } from 'lucide-react';
export function StorefrontFooter() {
  return (
    <footer className="shop-footer" id="kontak">
      <div className="shop-width">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand">
              <BrandLogo />
            </Link>
            <p>
              Teman setia untuk setiap langkahmu.
              <br />
              Koleksi tas berkualitas untuk sekolah,
              <br />
              kerja, dan perjalanan.
            </p>
            <span className="local-note">Dari usaha lokal, untuk cerita besarmu.</span>
          </div>
          <div>
            <h3>Jelajahi</h3>
            <Link to="/">Beranda</Link>
            <Link to="/catalog">Semua produk</Link>
            <Link to="/catalog?category=tas-ransel">Ransel</Link>
            <Link to="/catalog?category=tas-selempang">Selempang</Link>
            <Link to="/catalog?category=totebag">Totebag</Link>
          </div>
          <div>
            <h3>Untukmu</h3>
            <Link to="/customer/orders">Lacak pesanan</Link>
            <Link to="/wishlist">Daftar favorit</Link>
            <Link to="/cart">Keranjang belanja</Link>
            <Link to="/profile">Akun saya</Link>
          </div>
          <div>
            <h3>Mari terhubung.</h3>
            <p>Punya pertanyaan tentang koleksi atau pesanan? Kami siap membantu.</p>
            <a className="contact-link" href="mailto:halo@bagdaily.id">
              <Mail size={17} /> halo@bagdaily.id <ArrowUpRight size={17} />
            </a>
            <p className="footer-small">Senin–Sabtu · 09.00–17.00 WIB</p>
            <Link className="staff-link" to="/login">
              Akses admin & kasir <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BagDaily. Setiap langkah punya cerita.</span>
          <span>Dibuat dengan perhatian, dipakai setiap hari.</span>
        </div>
      </div>
    </footer>
  );
}
