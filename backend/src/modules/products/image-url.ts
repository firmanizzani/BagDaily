export function imageUrlFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const route = path.replace(/^local\//, '').replace(/^products\//, '');
  return `/api/media/products/${route}`;
}

export function withProductImageUrl<T extends { imagePath: string | null }>(product: T) {
  return { ...product, imageUrl: imageUrlFromPath(product.imagePath) };
}
