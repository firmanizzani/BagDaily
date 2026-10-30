import { describe, expect, it } from 'vitest';
import { imageUrlFromPath, withProductImageUrl } from '../src/modules/products/image-url.js';

describe('derived image URLs', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['arlo-crossbody-abc123.png', '/api/media/products/arlo-crossbody-abc123.png'],
    ['local/arlo-crossbody-abc123.png', '/api/media/products/arlo-crossbody-abc123.png'],
    ['products/id/old.png', '/api/media/products/id/old.png'],
    ['local/products/id/old.png', '/api/media/products/id/old.png'],
    ['id/old.png', '/api/media/products/id/old.png'],
    ['avatars/user/photo.png', '/api/media/products/avatars/user/photo.png'],
  ])('maps %s to a backend URL', (path, expected) => {
    expect(imageUrlFromPath(path)).toBe(expected);
  });
  it('preserves the API imageUrl field without storing it in the product record', () => {
    const stored = { id: 'product', name: 'Arlo', imagePath: 'arlo-123.png' };
    expect(withProductImageUrl(stored)).toEqual({ ...stored, imageUrl: '/api/media/products/arlo-123.png' });
    expect(stored).not.toHaveProperty('imageUrl');
  });
});
