import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollToHomeSection } from './useHomeSectionScroll';

const scrollTo = vi.fn();
const focus = vi.fn();
const getElementById = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getElementById.mockReturnValue({ getBoundingClientRect: () => ({ top: 500 }), focus });
  vi.stubGlobal('document', {
    getElementById,
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 88 }) }),
  });
  vi.stubGlobal('window', {
    scrollY: 1000,
    scrollTo,
    matchMedia: () => ({ matches: false }),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('home section navigation', () => {
  it('scrolls below the actual sticky header and transfers keyboard focus without a second jump', () => {
    expect(scrollToHomeSection('#faq')).toBe(true);
    expect(getElementById).toHaveBeenCalledWith('faq');
    expect(scrollTo).toHaveBeenCalledWith({ top: 1396, behavior: 'smooth' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('respects reduced motion', () => {
    vi.stubGlobal('window', {
      scrollY: 0,
      scrollTo,
      matchMedia: () => ({ matches: true }),
    });
    expect(scrollToHomeSection('#testimoni')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 396, behavior: 'instant' });
  });
  it('leaves unknown hashes and unmounted sections alone', () => {
    expect(scrollToHomeSection('#unknown')).toBe(false);
    getElementById.mockReturnValue(null);
    expect(scrollToHomeSection('#faq')).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});
