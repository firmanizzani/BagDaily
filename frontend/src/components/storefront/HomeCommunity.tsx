import { ChevronDown, Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

// Illustrative content only. Replace with customer-approved reviews before launch.
const sampleStories = [
  {
    name: 'Nadia',
    avatar: '/images/testimonial-nadia.png',
    activity: 'Untuk kerja & kuliah',
    quote:
      'Cari tas yang bisa dipakai kuliah sekaligus magang. Modelnya simpel, jadi gampang dipadukan sama baju apa saja. Suka banget warna netralnya.',
  },
  {
    name: 'Raka',
    avatar: '/images/testimonial-raka.png',
    activity: 'Untuk aktivitas harian',
    quote:
      'Biasanya cuma bawa dompet, HP, sama kunci. Tas selempang begini pas buat saya, nggak perlu bawa tas besar kalau cuma keluar sebentar.',
  },
  {
    name: 'Dinda',
    avatar: '/images/testimonial-dinda.png',
    activity: 'Untuk pergi santai',
    quote:
      'Tim yang selalu bawa banyak barang, bahkan pas jalan santai. Makanya paling cocok pakai totebag. Tinggal masukin barang, langsung berangkat.',
  },
];

const questions = [
  {
    question: 'Bagaimana cara belanja di BagDaily?',
    answer: (
      <>
        Pilih tas di <Link to="/catalog">katalog produk</Link>, tentukan jumlahnya, lalu
        masukkan ke keranjang. Login atau buat akun untuk melanjutkan checkout, pilih cara
        menerima pesanan, dan lanjutkan ke pembayaran.
      </>
    ),
  },
  {
    question: 'Berapa ongkos kirimnya?',
    answer:
      'Ongkos kirim ditampilkan saat checkout sesuai pilihan kurir dan zona tujuan. Periksa biaya pengiriman dan total pesanan sebelum melanjutkan pembayaran.',
  },
  {
    question: 'Bisa ambil pesanan langsung di toko?',
    answer:
      'Bisa. Pilih “Ambil di Toko” saat checkout untuk memesan tanpa ongkos kirim. Pantau status pesanan dan hubungi kami untuk memastikan detail pengambilan sebelum datang.',
  },
  {
    question: 'Apa saja pilihan pembayarannya?',
    answer:
      'Untuk pesanan online, kamu bisa memilih QRIS atau transfer bank. Petunjuk pembayaran dan total yang perlu dibayar akan ditampilkan setelah pesanan dibuat.',
  },
  {
    question: 'Bagaimana cara cek status pesanan?',
    answer: (
      <>
        Login ke akun yang digunakan saat belanja, lalu buka halaman{' '}
        <Link to="/customer/orders">pesanan saya</Link>. Pilih pesanan untuk melihat
        detail dan perkembangan statusnya.
      </>
    ),
  },
  {
    question: 'Bagaimana memilih tas yang pas?',
    answer:
      'Cek ukuran, bahan, dan deskripsi di halaman produk, lalu sesuaikan dengan barang yang biasa kamu bawa. Untuk laptop, bandingkan ukuran perangkatmu dengan dimensi tas. Kalau masih ragu, tanyakan kepada kami sebelum memesan.',
  },
];

export function HomeCommunity() {
  return (
    <>
      <section className="home-stories" id="testimoni" aria-labelledby="stories-heading">
        <div className="shop-width">
          <div className="section-title">
            <div>
              <h2 id="stories-heading">Testimoni Pelanggan</h2>
              <p>Apa kata mereka tentang BagDaily?</p>
            </div>
          </div>
          <div className="stories-grid">
            {sampleStories.map(story => (
              <figure className="customer-story" key={story.name}>
                <Quote className="story-quote-mark" size={27} aria-hidden="true" />
                <figcaption>
                  <img
                    className="story-avatar"
                    src={story.avatar}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                  />
                  <div>
                    <strong>{story.name}</strong>
                    <div className="story-stars" role="img" aria-label="5 dari 5 bintang">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={16}
                          fill="currentColor"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </figcaption>
                <blockquote>
                  <p>“{story.quote}”</p>
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="shop-width home-faq" id="faq" aria-labelledby="faq-heading">
        <div className="faq-intro">
          <div className="section-title">
            <div>
              <h2 id="faq-heading">Pertanyaan yang Sering Diajukan</h2>
              <p>Temukan jawaban untuk pertanyaan yang paling sering ditanyakan.</p>
            </div>
          </div>
        </div>
        <div className="faq-list">
          {[questions.slice(0, 3), questions.slice(3)].map((column, columnIndex) => (
            <div className="faq-column" key={columnIndex}>
              {column.map((item, index) => (
                <details
                  className="faq-item"
                  key={item.question}
                  open={columnIndex === 0 && index === 0}
                >
                  <summary>
                    <span>{item.question}</span>
                    <ChevronDown size={17} aria-hidden="true" />
                  </summary>
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
