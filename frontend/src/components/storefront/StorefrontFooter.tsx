import { BrandLogo } from '@/components/shared/BrandLogo';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, MapPin } from 'lucide-react';
import { APP_TIME_ZONE } from '@/lib/utils';
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
            <Link to="/#testimoni">Testimoni</Link>
            <Link to="/#faq">FAQ</Link>
          </div>
          <div>
            <h3>Mari terhubung.</h3>
            <p>Punya pertanyaan tentang koleksi atau pesanan? Kami siap membantu.</p>
            <a className="contact-link" href="mailto:halo@bagdaily.id">
              <Mail size={17} /> halo@bagdaily.id <ArrowUpRight size={17} />
            </a>
            <p className="flex items-center gap-2">
              <MapPin size={17} className="shrink-0" aria-hidden="true" />
              Jl. Pengadegan No. 24, Jakarta Selatan
            </p>
            <p className="footer-small">Senin–Minggu · 09.00–21.00 WIB</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            ©{' '}
            {new Intl.DateTimeFormat('en', {
              year: 'numeric',
              timeZone: APP_TIME_ZONE,
            }).format(new Date())}{' '}
            BagDaily. Hak cipta dilindungi.
          </span>
        </div>
      </div>
    </footer>
  );
}
