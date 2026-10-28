import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 py-12 text-sm text-[#6E7E8D]">
      <LoaderCircle className="animate-spin text-[#15616D]" size={25} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  message = 'Data tidak dapat dimuat.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-panel">
      <AlertCircle className="text-rose-600" size={25} />
      <h3>Terjadi kendala</h3>
      <p>{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={15} /> Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  to,
}: {
  title: string;
  description: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="state-panel">
      <PackageOpen className="text-[#15616D]" size={27} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && to ? (
        <Button asChild variant="teal" size="sm">
          <Link to={to}>
            {action} <ArrowRight size={15} />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
