import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUser } from '@/hooks/api';

export function useShopLogin() {
  const session = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  return async (action: 'favorit' | 'keranjang') => {
    // Validate the cookie before changing local data, including after session expiry.
    const result = await session.refetch();
    if (result.isError) {
      toast.error('Sesi belum dapat diperiksa. Silakan coba lagi.');
      return false;
    }
    if (result.data) return true;

    toast.info(
      action === 'favorit'
        ? 'Login dulu untuk menyimpan produk favorit.'
        : 'Login dulu untuk menambahkan produk ke keranjang.',
    );
    const from = location.pathname + location.search + location.hash;
    navigate(`/login?from=${encodeURIComponent(from)}`);
    return false;
  };
}
