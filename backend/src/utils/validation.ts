import { z } from 'zod';

export const idSchema = z.string().uuid();
export const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(12) }).passthrough();
export const credentialsSchema = z.object({ email: z.string().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(8).max(128) });
export const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(100) }).strict();
export const productInputSchema = z.object({ categoryId: idSchema, sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(160), slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().max(5000), material: z.string().max(200), price: z.number().int().positive().max(2147483647), costPrice: z.number().int().min(0).max(2147483647).optional(), stock: z.number().int().min(0).max(2147483647).optional(), minimumStock: z.number().int().min(0).max(2147483647).optional(), isActive: z.boolean().optional() }).strict();
const itemSchema = z.object({ productId: idSchema, quantity: z.number().int().min(1).max(100) }).strict();
const itemsArray = z.array(itemSchema).min(1).max(50);
export const orderInputSchema = z.object({ items: itemsArray, pointsToRedeem: z.number().int().min(0).max(2147483647).optional(), deliveryMethod: z.enum(['shipping', 'pickup']), shippingRateId: idSchema.optional(), recipientName: z.string().trim().min(2).max(100).optional(), recipientPhone: z.string().trim().min(6).max(30).optional(), shippingAddress: z.string().trim().min(5).max(1000).optional() }).strict().superRefine((v, ctx) => { if (new Set(v.items.map(i => i.productId)).size !== v.items.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Duplicate product IDs are not allowed' }); if (v.deliveryMethod === 'shipping' && (!v.shippingRateId || !v.recipientName || !v.recipientPhone || !v.shippingAddress)) ctx.addIssue({ code: 'custom', message: 'Shipping requires rate, recipient name, phone, and address' }); if (v.deliveryMethod === 'pickup' && v.shippingRateId) ctx.addIssue({ code: 'custom', message: 'Pickup cannot include shipping rate' }); });
export const posInputSchema = z.object({ items: itemsArray, customerId: idSchema.optional(), pointsToRedeem: z.number().int().min(0).max(2147483647).optional(), paymentMethod: z.enum(['cash', 'qris', 'bank_transfer', 'debit', 'credit', 'points']).default('cash'), cashReceived: z.number().int().min(0).max(2147483647).optional() }).strict().superRefine((v, ctx) => {
  if (new Set(v.items.map(i => i.productId)).size !== v.items.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Duplicate product IDs are not allowed' });
  if (v.pointsToRedeem && !v.customerId) ctx.addIssue({ code: 'custom', path: ['customerId'], message: 'Pilih pelanggan untuk memakai poin' });
  if (v.paymentMethod === 'cash' && v.cashReceived === undefined) ctx.addIssue({ code: 'custom', path: ['cashReceived'], message: 'Cash received is required for cash payments' });
  if (v.paymentMethod !== 'cash' && v.cashReceived !== undefined) ctx.addIssue({ code: 'custom', path: ['cashReceived'], message: 'Cash received is only allowed for cash payments' });
});
export const adjustmentSchema = z.object({
  productId: idSchema,
  type: z.enum(['restock', 'correction']),
  quantity: z.number().int().min(-2147483647).max(2147483647).refine(n => n !== 0, { message: 'Quantity must not be zero' }).optional(),
  targetStock: z.number().int().min(0).max(2147483647).optional(),
  expectedStock: z.number().int().min(0).max(2147483647).optional(),
  notes: z.string().trim().min(1).max(500),
}).strict().superRefine((v, ctx) => {
  if ((v.quantity === undefined) === (v.targetStock === undefined)) ctx.addIssue({ code: 'custom', message: 'Provide either quantity or targetStock' });
  if (v.type === 'restock' && (v.targetStock !== undefined || !v.quantity || v.quantity < 1)) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Restock quantity must be positive' });
  if (v.targetStock !== undefined && v.expectedStock === undefined) ctx.addIssue({ code: 'custom', path: ['expectedStock'], message: 'Current stock is required for correction' });
});
export type OrderInput = z.infer<typeof orderInputSchema>;
export type PosInput = z.infer<typeof posInputSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export function parse<T>(schema: z.ZodType<T>, input: unknown): T { return schema.parse(input); }
