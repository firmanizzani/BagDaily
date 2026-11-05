import { describe, expect, it } from 'vitest';
import type { Order } from '@/types/api';
import { customerOrderAction, customerOrderTone } from './customerOrders';

const order = (changes: Partial<Order> = {}) =>
  ({
    status: 'awaiting_payment',
    paymentStatus: 'unpaid',
    deliveryMethod: 'shipping',
    paymentDeadline: '2026-11-05T12:00:00Z',
    ...changes,
  }) as Order;
const now = Date.parse('2026-11-05T11:00:00Z');

describe('customer order actions', () => {
  it('only offers payment for unpaid, unexpired orders', () => {
    expect(customerOrderAction(order(), now)).toBe('pay');
    expect(
      customerOrderAction(order({ paymentDeadline: '2026-11-05T11:00:00Z' }), now),
    ).toBe('view');
    expect(customerOrderAction(order({ status: 'cancelled' }), now)).toBe('view');
    expect(customerOrderAction(order({ paymentStatus: 'paid' }), now)).toBe('view');
  });
  it('allows confirmation only after paid delivery or pickup readiness', () => {
    expect(customerOrderAction(order({ status: 'shipped', paymentStatus: 'paid' }))).toBe(
      'receive',
    );
    expect(
      customerOrderAction(
        order({ status: 'packed', deliveryMethod: 'pickup', paymentStatus: 'paid' }),
      ),
    ).toBe('receive');
    expect(customerOrderAction(order({ status: 'packed', paymentStatus: 'paid' }))).toBe(
      'view',
    );
    expect(customerOrderAction(order({ status: 'shipped' }))).toBe('view');
    expect(
      customerOrderAction(order({ status: 'completed', paymentStatus: 'paid' })),
    ).toBe('view');
  });
  it('keeps processing visually distinct from delivered and cancelled orders', () => {
    expect(customerOrderTone('awaiting_confirmation')).toBe('waiting');
    expect(customerOrderTone('shipped')).toBe('shipped');
    expect(customerOrderTone('completed')).toBe('completed');
    expect(customerOrderTone('cancelled')).toBe('cancelled');
  });
});
