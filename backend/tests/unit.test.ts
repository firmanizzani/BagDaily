import { describe, it, expect } from 'vitest';
import { validTransition } from '../src/modules/orders/service.js';

describe('validTransition', () => {
  it('allows awaiting_confirmation → confirmed', () => { expect(validTransition('awaiting_confirmation', 'confirmed', 'shipping')).toBe(true); });
  it('allows confirmed → packed', () => { expect(validTransition('confirmed', 'packed', 'shipping')).toBe(true); });
  it('allows packed → shipped for shipping', () => { expect(validTransition('packed', 'shipped', 'shipping')).toBe(true); });
  it('allows packed → completed for pickup', () => { expect(validTransition('packed', 'completed', 'pickup')).toBe(true); });
  it('disallows packed → shipped for pickup', () => { expect(validTransition('packed', 'shipped', 'pickup')).toBe(false); });
  it('allows shipped → completed', () => { expect(validTransition('shipped', 'completed', 'shipping')).toBe(true); });
  it('disallows awaiting_payment → confirmed', () => { expect(validTransition('awaiting_payment', 'confirmed', 'shipping')).toBe(false); });
  it('disallows completed → anything', () => { expect(validTransition('completed', 'cancelled', 'shipping')).toBe(false); });
  it('disallows skipping steps', () => { expect(validTransition('confirmed', 'shipped', 'shipping')).toBe(false); });
});

describe('hashObject deterministic', async () => {
  const { hashObject } = await import('../src/utils/misc.js');
  it('same object same hash', () => { expect(hashObject({ a: 1, b: 'x' })).toBe(hashObject({ a: 1, b: 'x' })); });
  it('different objects different hash', () => { expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 })); });
});

describe('Zod schemas', async () => {
  const { orderInputSchema, posInputSchema, adjustmentSchema, registerSchema } = await import('../src/utils/validation.js');
  it('rejects duplicate productIds in order', () => {
    const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    expect(() => orderInputSchema.parse({ items: [{ productId: id, quantity: 1 }, { productId: id, quantity: 2 }], deliveryMethod: 'pickup' })).toThrow();
  });
  it('requires shipping fields when deliveryMethod is shipping', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    expect(() => orderInputSchema.parse({ items: [{ productId: id, quantity: 1 }], deliveryMethod: 'shipping' })).toThrow();
  });
  it('accepts valid pickup order', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    const r = orderInputSchema.parse({ items: [{ productId: id, quantity: 2 }], deliveryMethod: 'pickup' });
    expect(r.deliveryMethod).toBe('pickup');
    expect(r.items).toHaveLength(1);
  });
  it('rejects zero quantity in pos', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    expect(() => posInputSchema.parse({ items: [{ productId: id, quantity: 0 }], cashReceived: 100000 })).toThrow();
  });
  it('rejects adjustment quantity of zero', () => {
    expect(() => adjustmentSchema.parse({ productId: '00000000-0000-0000-0000-000000000001', type: 'restock', quantity: 0, notes: 'test' })).toThrow();
  });
  it('rejects restock with negative quantity', () => {
    expect(() => adjustmentSchema.parse({ productId: '00000000-0000-0000-0000-000000000001', type: 'restock', quantity: -5, notes: 'test' })).toThrow();
  });
  it('allows correction with negative quantity', () => {
    const r = adjustmentSchema.parse({ productId: '00000000-0000-0000-0000-000000000001', type: 'correction', quantity: -5, notes: 'test' });
    expect(r.quantity).toBe(-5);
  });
  it('rejects short password at register', () => {
    expect(() => registerSchema.parse({ name: 'Test User', email: 'test@example.com', password: 'short' })).toThrow();
  });
  it('accepts an eight-character password and rejects seven characters', () => {
    expect(registerSchema.safeParse({name:'Test User',email:'test@example.com',password:'12345678'}).success).toBe(true);
    expect(registerSchema.safeParse({name:'Test User',email:'test@example.com',password:'1234567'}).success).toBe(false);
  });
  it('rejects role injection at register', () => {
    expect(() => (registerSchema as import('zod').AnyZodObject).parse({ name: 'Test User', email: 'test@example.com', password: 'longpassword1234', role: 'admin' })).toThrow();
  });
  it('normalizes email to lowercase', () => {
    const r = registerSchema.parse({ name: 'Test User', email: 'TEST@Example.COM', password: 'longpassword1234' });
    expect(r.email).toBe('test@example.com');
  });
});


describe('POS payment methods', async () => {
  const { posInputSchema } = await import('../src/utils/validation.js');
  const items = [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1 }];
  it('preserves cash as the default for existing clients', () => {
    expect(posInputSchema.parse({ items, cashReceived: 200000 }).paymentMethod).toBe('cash');
  });
  it.each(['qris', 'bank_transfer', 'debit', 'credit'])('accepts %s without cash received', paymentMethod => {
    expect(posInputSchema.parse({ items, paymentMethod }).paymentMethod).toBe(paymentMethod);
    expect(posInputSchema.safeParse({ items, paymentMethod, cashReceived: 200000 }).success).toBe(false);
  });
  it('requires a valid cash amount and rejects unsupported methods', () => {
    for (const body of [{ items }, { items, cashReceived: -1 }, { items, paymentMethod: 'card' }]) {
      expect(posInputSchema.safeParse(body).success).toBe(false);
    }
  });
});
