import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { categories, products } from "../../db/schema/index.js";
import { paginated } from "../../utils/response.js";
import { notFound } from "../../utils/errors.js";
import { withProductImageUrl } from './image-url.js';

const filters = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(180).optional(),
  sort: z.enum(["price_asc", "price_desc", "name", "newest"]).default("newest"),
  availability: z.enum(["in_stock", "out_of_stock", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
export async function getProducts(
  req: import("express").Request,
  admin = false,
) {
  const f = filters.parse(req.query);
  const cond = [];
  if (!admin) cond.push(eq(products.isActive, true));
  if (f.search)
    cond.push(
      ilike(
        products.name,
        `%${f.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
      ),
    );
  if (f.category)
    cond.push(
      sql`(${products.categoryId}::text = ${f.category} or ${products.categoryId} in (select id from categories where slug=${f.category}))`,
    );
  if (f.availability === "in_stock") cond.push(sql`${products.stock} > 0`);
  if (f.availability === "out_of_stock") cond.push(eq(products.stock, 0));
  if (admin && req.query["isActive"] !== undefined)
    cond.push(
      eq(
        products.isActive,
        z
          .enum(["true", "false"])
          .transform((value) => value === "true")
          .parse(req.query["isActive"]),
      ),
    );
  const where = cond.length ? and(...cond) : undefined;
  const order = {
    price_asc: asc(products.price),
    price_desc: desc(products.price),
    name: asc(products.name),
    newest: desc(products.createdAt),
  }[f.sort];
  const rows = await db
    .select({
      totalCount: sql<number>`count(*) over()::int`,
      id: products.id,
      categoryId: products.categoryId,
      sku: products.sku,
      name: products.name,
      slug: products.slug,
      description: products.description,
      material: products.material,
      price: products.price,
      stock: products.stock,
      minimumStock: products.minimumStock,
      imagePath: products.imagePath,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      category: categories,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(order)
    .limit(f.limit)
    .offset((f.page - 1) * f.limit);
  let total = rows[0]?.totalCount ?? 0;
  // An out-of-range page has no window row to carry its count.
  if (!rows.length && f.page > 1) {
    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where);
    total = count.count;
  }
  return paginated(
    rows.map(({ totalCount: _totalCount, ...row }) => withProductImageUrl(row)),
    total,
    f.page,
    f.limit,
  );
}

export async function getProduct(id: string) {
  const [p] = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      sku: products.sku,
      name: products.name,
      slug: products.slug,
      description: products.description,
      material: products.material,
      price: products.price,
      stock: products.stock,
      minimumStock: products.minimumStock,
      imagePath: products.imagePath,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      category: categories,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isActive, true),
        sql`(${products.id}::text=${id} or ${products.slug}=${id})`,
      ),
    );
  if (!p) notFound("Product not found");
  return withProductImageUrl(p);
}
