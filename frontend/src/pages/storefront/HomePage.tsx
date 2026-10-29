import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Store,
  PackageCheck,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useStorefrontMotion } from '@/hooks/useStorefrontMotion';
import type { Product } from '@/types/api';
import { ProductCard } from '@/components/storefront/ProductCard';
import { HomeCommunity } from '@/components/storefront/HomeCommunity';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { ErrorState, LoadingState } from '@/components/shared/states';

const collections = [
  {
    name: 'Tas Ransel',
    slug: 'tas-ransel',
    product: 'Mero Daypack',
    text: 'Siap menemani kerja, kuliah, dan perjalananmu.',
    tone: 'blue',
  },
  {
    name: 'Tas Selempang',
    slug: 'tas-selempang',
    product: 'Kiro Flap Sling',
    text: 'Ringan dibawa. Praktis untuk setiap aktivitas.',
    tone: 'sand',
  },
  {
    name: 'Totebag',
    slug: 'totebag',
    product: 'Sora Canvas Tote',
    text: 'Simpel, serbaguna, dan selalu bisa diandalkan.',
    tone: 'cream',
  },
];
const promises = [
  {
    icon: ShieldCheck,
    title: 'Kualitas pilihan',
    text: 'Dibuat untuk dipakai setiap hari',
  },
  { icon: Tag, title: 'Harga bersahabat', text: 'Pilihan terbaik untuk kebutuhanmu' },
  { icon: Truck, title: 'Pengiriman aman', text: 'Kirim ke rumah atau ambil di toko' },
  { icon: Store, title: 'Dukung UMKM', text: 'Langkah kecil, dampak berarti' },
];
export function HomePage() {
  const motionRef = useStorefrontMotion();
  const products = useApi<Product[]>('/products?limit=18&availability=in_stock');
  const priority = [
    'rhea-mini-pack',
    'kiro-flap-sling',
    'sora-canvas-tote',
    'zeno-laptop-pack',
    'arlo-crossbody',
  ];
  const featured = [...(products.data?.data || [])]
    .sort(
      (a, b) =>
        (priority.indexOf(a.slug) < 0 ? 99 : priority.indexOf(a.slug)) -
        (priority.indexOf(b.slug) < 0 ? 99 : priority.indexOf(b.slug)),
    )
    .slice(0, 5);
  return (
    <div className="store-home" ref={motionRef}>
      <section className="shop-hero">
        <img
          className="hero-scene"
          src="/images/bagdaily-hero.png"
          alt="Koleksi tas BagDaily di atas meja kayu dengan cahaya hangat"
          fetchPriority="high"
        />
        <div className="shop-width hero-inner">
          <div className="hero-copy">
            <h1>
              Teman setia
              <br />
              setiap <em>langkahmu.</em>
            </h1>
            <p>
              Tas berkualitas untuk cerita sehari-hari.
              <br />
              Praktis, penuh gaya, dan ramah di kantong.
            </p>
            <div className="hero-actions">
              <Link className="shop-button cream-button" to="/catalog">
                Belanja sekarang <ArrowRight size={18} />
              </Link>
              <a className="shop-button outline-light" href="#koleksi">
                Lihat koleksi
              </a>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={17} /> Kualitas terjaga. Dibuat untuk perjalananmu.
            </div>
          </div>
        </div>
      </section>
      <div className="promise-strip">
        <div className="shop-width promise-grid">
          {promises.map(({ icon: Icon, title, text }) => (
            <div className="promise" key={title}>
              <span className="promise-icon">
                <Icon size={25} strokeWidth={1.6} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <section className="shop-width home-section" id="koleksi">
        <div className="section-title">
          <h2>Temukan tas yang pas.</h2>
          <Link to="/catalog">
            Jelajahi semua kategori <ArrowRight size={17} />
          </Link>
        </div>
        <div className="collection-grid">
          {collections.map(c => (
            <Link
              className={`collection-card ${c.tone}`}
              key={c.slug}
              to={`/catalog?category=${c.slug}`}
            >
              <ProductPhoto name={c.product} className="collection-photo" />
              <div>
                <h3>{c.name}</h3>
                <p>{c.text}</p>
                <span className="round-arrow">
                  <ArrowRight size={19} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="shop-width home-section">
        <div className="section-title">
          <div>
            <h2>Pilihan untuk harimu.</h2>
            <p>Desain favorit, siap jadi teman aktivitasmu.</p>
          </div>
          <Link to="/catalog">
            Lihat semua produk <ArrowRight size={17} />
          </Link>
        </div>
        {products.isLoading ? (
          <LoadingState label="Menyiapkan koleksi pilihan…" />
        ) : products.isError ? (
          <ErrorState
            message="Koleksi belum dapat dimuat."
            onRetry={() => void products.refetch()}
          />
        ) : featured.length ? (
          <div className="featured-grid">
            {featured.map(product => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : (
          <p>Koleksi baru sedang disiapkan. Kembali lagi segera.</p>
        )}
      </section>
      <section className="shop-width home-section about-section" id="tentang">
        <div className="section-title">
          <h2>Lebih dari sekadar tas.</h2>
          <span>Untuk langkah besar dan hal-hal kecil.</span>
        </div>
        <div className="reason-grid">
          {[
            {
              icon: ShoppingCart,
              title: 'Belanja semudah itu',
              text: 'Pilih favoritmu, masukkan keranjang, dan checkout dalam beberapa langkah.',
            },
            {
              icon: Truck,
              title: 'Kirim atau ambil',
              text: 'Pilih pengiriman ke rumah atau ambil langsung di toko tanpa ongkir.',
            },
            {
              icon: PackageCheck,
              title: 'Selalu tahu kabarnya',
              text: 'Pantau proses pesanan sampai tas favoritmu tiba dengan aman.',
            },
            {
              icon: Store,
              title: 'Tumbuh bersama lokal',
              text: 'Setiap pembelianmu ikut mendukung perjalanan usaha lokal.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div className="reason" key={title}>
              <Icon size={30} strokeWidth={1.5} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <HomeCommunity />
      <section className="closing-banner">
        <div className="shop-width">
          <h2>
            Langkah baru,
            <br />
            teman yang sama.
          </h2>
          <Link className="shop-button cream-button" to="/catalog">
            Temukan favoritmu <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
