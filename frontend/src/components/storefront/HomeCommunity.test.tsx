import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HomeCommunity } from './HomeCommunity';

describe('FAQ initial state', () => {
  it('starts with all six questions closed while keeping their native disclosure controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomeCommunity />
      </MemoryRouter>,
    );
    const details = html.match(/<details\b[^>]*>/g) ?? [];
    expect(details).toHaveLength(6);
    expect(details.every(tag => !/\sopen(?:[\s=>])/.test(tag))).toBe(true);
    expect(html.match(/<summary>/g)).toHaveLength(6);
  });
});
