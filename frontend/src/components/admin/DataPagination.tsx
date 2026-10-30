import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination } from '@/types/api';

export function DataPagination({
  pagination,
  noun,
  disabled,
  onPage,
}: {
  pagination?: Pagination;
  noun: string;
  disabled?: boolean;
  onPage: (page: number) => void;
}) {
  if (!pagination) return null;
  const { page, limit, total, totalPages } = pagination;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter(value => value > 0 && value <= totalPages)
    .sort((a, b) => a - b);
  return (
    <footer className="data-pagination">
      <nav aria-label={`Halaman ${noun}`}>
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        {pages.map((value, index) => (
          <span className="page-number-group" key={value}>
            {index > 0 && value - pages[index - 1]! > 1 && (
              <span className="page-ellipsis">…</span>
            )}
            <button
              type="button"
              aria-label={`Halaman ${value}`}
              aria-current={value === page ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onPage(value)}
            >
              {value}
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={disabled || page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </nav>
      <p>
        Menampilkan {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)}{' '}
        dari {total.toLocaleString('id-ID')} {noun}
      </p>
    </footer>
  );
}
