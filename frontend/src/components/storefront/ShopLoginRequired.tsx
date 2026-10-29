import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '@/hooks/api';
import { ErrorState, LoadingState } from '@/components/shared/states';

export function ShopLoginRequired() {
  const session = useUser();
  const location = useLocation();
  if (session.isLoading) return <LoadingState label="Memeriksa sesi akun…" />;
  if (session.isError)
    return (
      <ErrorState
        message="Sesi belum dapat diperiksa. Silakan coba lagi."
        onRetry={() => void session.refetch()}
      />
    );
  if (!session.data) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />;
  }
  return <Outlet />;
}
