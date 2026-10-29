import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useShopLogin } from './useShopLogin';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  navigate: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/hooks/api', () => ({ useUser: () => ({ refetch: mocks.refetch }) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({
    pathname: '/catalog',
    search: '?category=totebag',
    hash: '#tas',
  }),
}));
vi.mock('sonner', () => ({ toast: { info: mocks.info, error: mocks.error } }));

describe('shopping login guard', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['favorit', 'keranjang'] as const)(
    'blocks guest %s and preserves the return URL',
    async action => {
      mocks.refetch.mockResolvedValue({ data: null, isError: false });
      expect(await useShopLogin()(action)).toBe(false);
      expect(mocks.navigate).toHaveBeenCalledWith(
        '/login?from=%2Fcatalog%3Fcategory%3Dtotebag%23tas',
      );
      expect(mocks.info).toHaveBeenCalled();
    },
  );
  it('allows an authenticated user after checking the session', async () => {
    mocks.refetch.mockResolvedValue({ data: { id: 'customer' }, isError: false });
    expect(await useShopLogin()('keranjang')).toBe(true);
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it('blocks changes when session verification fails without treating it as logout', async () => {
    mocks.refetch.mockResolvedValue({ data: { id: 'stale-session' }, isError: true });
    expect(await useShopLogin()('favorit')).toBe(false);
    expect(mocks.error).toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
