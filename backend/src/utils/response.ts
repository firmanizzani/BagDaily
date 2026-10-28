export function ok<T>(data: T, extra?: Record<string, unknown>) { return { data, ...(extra ?? {}) }; }
export function paginated<T>(data: T[], total: number, page: number, limit: number) { return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
