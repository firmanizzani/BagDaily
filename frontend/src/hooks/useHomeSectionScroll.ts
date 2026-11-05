import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function scrollToHomeSection(hash: string) {
  if (hash !== '#testimoni' && hash !== '#faq') return false;
  const section = document.getElementById(hash.slice(1));
  if (!section) return false;
  const headerHeight =
    document.querySelector('.shop-header')?.getBoundingClientRect().height ?? 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: Math.max(
      0,
      window.scrollY + section.getBoundingClientRect().top - headerHeight - 16,
    ),
    behavior: reducedMotion ? 'instant' : 'smooth',
  });
  section.focus({ preventScroll: true });
  return true;
}

export function useHomeSectionScroll(ready: boolean) {
  const location = useLocation();
  useEffect(() => {
    if (!ready || location.pathname !== '/') return;
    // Wait for the route and any loading product grid to finish laying out.
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) scrollToHomeSection(location.hash);
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready, location.pathname, location.hash, location.key]);
}
