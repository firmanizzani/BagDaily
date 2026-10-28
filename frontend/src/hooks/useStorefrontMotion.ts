import { useLayoutEffect, useRef } from 'react';

const revealSelector = [
  '.promise',
  '.section-title h2',
  '.section-title p',
  '.section-title > a',
  '.section-title > span',
  '.collection-card',
  '.shop-product',
  '.reason',
  '.closing-banner h2',
  '.closing-banner .shop-button',
].join(',');

export function useStorefrontMotion() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const registered = new WeakSet<Element>();
    const animations = new Map<HTMLElement, Animation>();
    const hero = root.querySelector<HTMLElement>('.hero-scene');
    const heroSection = root.querySelector<HTMLElement>('.shop-hero');
    let frame = 0;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const element = entry.target as HTMLElement;
          if (element.dataset.scrollRevealed === 'true') continue;
          element.dataset.scrollRevealed = 'true';
          const animation = animations.get(element);
          if (!animation) continue;
          if (reduced.matches) animation.cancel();
          else animation.play();
        }
      },
      { threshold: 0, rootMargin: '0px 0px 36px 0px' },
    );

    const register = () => {
      root.querySelectorAll<HTMLElement>(revealSelector).forEach(element => {
        if (registered.has(element)) return;
        registered.add(element);
        if (
          reduced.matches ||
          !element.animate ||
          element.dataset.scrollRevealed === 'true'
        )
          return;
        const group = element.closest(
          '.collection-grid,.featured-grid,.reason-grid,.promise-grid',
        );
        const index = group ? Array.from(group.children).indexOf(element) : 0;
        const picture = element.matches('.collection-card,.shop-product');
        const animation = element.animate(
          [
            {
              opacity: 0,
              translate: `0 ${picture ? 28 : 18}px`,
              ...(picture ? { scale: 0.98 } : {}),
            },
            { opacity: 1, translate: '0 0', ...(picture ? { scale: 1 } : {}) },
          ],
          {
            duration: picture ? 760 : 620,
            delay: Math.max(0, Math.min(index, 4)) * 75,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          },
        );
        // Prepare before paint, including cards inserted by the API response. They
        // must never paint visibly and then jump back to the animation's first frame.
        animation.pause();
        animation.currentTime = 0;
        animations.set(element, animation);
        void animation.finished.then(
          () => {
            animation.cancel();
            animations.delete(element);
          },
          () => animations.delete(element),
        );
        observer.observe(element);
      });
    };
    register();
    // Product cards arrive asynchronously; they receive the same entrance choreography.
    const mutations = new MutationObserver(register);
    mutations.observe(root, { childList: true, subtree: true });

    const updateHero = () => {
      frame = 0;
      if (!hero || !heroSection) return;
      if (reduced.matches) {
        hero.style.removeProperty('transform');
        return;
      }
      const rect = heroSection.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
      hero.style.transform = `translate3d(0, ${progress * 28}px, 0) scale(1.14)`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHero);
    };
    const preferenceChanged = () => {
      if (reduced.matches) {
        animations.forEach((animation, element) => {
          animation.cancel();
          element.dataset.scrollRevealed = 'true';
          observer.unobserve(element);
        });
        animations.clear();
      }
      schedule();
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', preferenceChanged);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach(animation => animation.cancel());
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', preferenceChanged);
      hero?.style.removeProperty('transform');
    };
  }, []);

  return ref;
}
