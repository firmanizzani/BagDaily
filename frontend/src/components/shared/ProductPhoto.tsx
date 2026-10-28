const names = [
  'Arlo Crossbody',
  'Nara Sling',
  'Kiro Flap Sling',
  'Tavo Utility Sling',
  'Lumi Mini Sling',
  'Dova Pocket Sling',
  'Mero Daypack',
  'Zeno Laptop Pack',
  'Kavi Campus Pack',
  'Rhea Mini Pack',
  'Orin Roll-Top Pack',
  'Talo Trail Pack',
  'Sora Canvas Tote',
  'Kuma Zip Tote',
  'Lino Shopper Tote',
  'Mika Pocket Tote',
  'Ayo Stripe Tote',
  'Hana Mini Tote',
];
export function ProductPhoto({
  name,
  src,
  className = '',
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const index = names.indexOf(name);
  if (src)
    return (
      <img src={src} alt={name} className={`product-image ${className}`} loading="lazy" />
    );
  if (index < 0)
    return (
      <div
        className={`catalog-photo photo-unavailable ${className}`}
        role="img"
        aria-label={`Foto ${name} belum tersedia`}
      >
        Foto belum tersedia
      </div>
    );
  return (
    <div
      role="img"
      aria-label={name}
      className={`catalog-photo ${className}`}
      style={{
        backgroundImage: 'url(/images/product-collection.png)',
        backgroundSize: '600% 300%',
        backgroundPosition: `${(index % 6) * 20}% ${Math.floor(index / 6) * 50}%`,
      }}
    />
  );
}
