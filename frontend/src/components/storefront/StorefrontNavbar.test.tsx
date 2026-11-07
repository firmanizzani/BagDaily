import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontNavbar } from './StorefrontNavbar';

const mock = vi.hoisted(() => ({ useUser: vi.fn() }));
vi.mock('@/hooks/api', () => ({ useUser: mock.useUser }));
vi.mock('@/features/auth/useAuth', () => ({
  useLogout: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
beforeEach(() =>
  mock.useUser.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
);

function render(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <StorefrontNavbar />
    </MemoryRouter>,
  );
}

describe('storefront section navigation', () => {
  it.each(['faq', 'testimoni'])('marks only %s active on its home section', section => {
    const html = render('/#' + section);
    expect(html.match(/aria-current=/g)).toHaveLength(1);
    expect(html).toMatch(
      new RegExp(
        `<a(?=[^>]*href="/#${section}")(?=[^>]*class="active")(?=[^>]*aria-current="location")[^>]*>`,
      ),
    );
    expect(html.match(/<a([^>]*)>Beranda<\/a>/)?.[1]).not.toContain('class="active"');
  });
  it('keeps the home and catalog active states independent from section links', () => {
    expect(render('/')).toContain('class="active" aria-current="page" href="/"');
    const html = render('/catalog');
    expect(html).toContain('href="/#faq"');
    expect(html).toContain('href="/#testimoni"');
    expect(html).not.toContain('aria-current="location"');
    expect(html.match(/aria-current=/g)).toHaveLength(1);
  });
});

describe('navbar session refresh', () => {
  it('reserves the account icon while validating a session instead of flashing Login', () => {
    mock.useUser.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const html = render('/');
    expect(html).toContain('Memeriksa sesi akun');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('profile-trigger has-avatar nav-session-pending');
    expect(html).not.toContain('class="nav-login"');
  });
  it('shows Login for a guest', () => {
    expect(render('/')).toContain('class="nav-login"');
  });
  it('keeps the account menu for a confirmed customer', () => {
    mock.useUser.mockReturnValue({
      data: {
        id: 'customer-1',
        name: 'Nadia',
        email: 'nadia@gmail.com',
        role: 'pelanggan',
      },
      isLoading: false,
      isError: false,
    });
    const html = render('/');
    expect(html).toContain('Buka menu profil');
    expect(html).not.toContain('class="nav-login"');
  });
  it('offers Login when the session cannot be loaded and no user is known', () => {
    mock.useUser.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });
    const html = render('/');
    expect(html).toContain('class="nav-login"');
    expect(html).toContain('href="/login"');
  });
});
