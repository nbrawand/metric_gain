import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePageMeta } from './pageMeta';

function Page({ title, description, path }: { title: string; description: string; path: string }) {
  usePageMeta({ title, description, path });
  return <div>page</div>;
}

const head = () => document.head;
const content = (selector: string) => head().querySelector(selector)?.getAttribute('content');
const canonical = () => head().querySelector('link[rel="canonical"]')?.getAttribute('href');

/** index.html ships these; jsdom starts with an empty head. */
const givenIndexHtmlTags = () => {
  head().innerHTML = `
    <meta name="description" content="site default" />
    <meta property="og:title" content="site title" />
    <meta property="og:description" content="site default" />
    <meta property="og:url" content="https://www.strength-guider.com" />
    <meta name="twitter:title" content="site title" />
    <meta name="twitter:description" content="site default" />
  `;
  // After the innerHTML write, not before: replacing the head drops the
  // <title> element that setting document.title created
  document.title = 'site title';
};

beforeEach(() => {
  document.title = 'site title';
});

afterEach(() => {
  head().innerHTML = '';
});

describe('usePageMeta', () => {
  it('sets the title and the description tags for the route', () => {
    givenIndexHtmlTags();
    render(<Page title="Guide" description="A guide" path="/how-it-works" />);

    expect(document.title).toBe('Guide');
    expect(content('meta[name="description"]')).toBe('A guide');
    expect(content('meta[property="og:title"]')).toBe('Guide');
    expect(content('meta[property="og:description"]')).toBe('A guide');
    expect(content('meta[name="twitter:description"]')).toBe('A guide');
  });

  it('builds an absolute canonical url from the path', () => {
    givenIndexHtmlTags();
    render(<Page title="Guide" description="A guide" path="/how-it-works" />);

    expect(canonical()).toBe('https://www.strength-guider.com/how-it-works');
    expect(content('meta[property="og:url"]')).toBe(
      'https://www.strength-guider.com/how-it-works'
    );
  });

  it('puts everything back on unmount', () => {
    // Otherwise the guide's description follows the user to the next page,
    // which is the bug this hook exists to fix, only inverted
    givenIndexHtmlTags();
    const view = render(<Page title="Guide" description="A guide" path="/how-it-works" />);
    view.unmount();

    expect(document.title).toBe('site title');
    expect(content('meta[name="description"]')).toBe('site default');
    expect(content('meta[property="og:url"]')).toBe('https://www.strength-guider.com');
    expect(canonical()).toBeUndefined();
  });

  it('leaves a canonical it did not create alone', () => {
    givenIndexHtmlTags();
    const existing = document.createElement('link');
    existing.rel = 'canonical';
    existing.href = 'https://www.strength-guider.com/original';
    head().appendChild(existing);

    const view = render(<Page title="Guide" description="A guide" path="/how-it-works" />);
    expect(canonical()).toBe('https://www.strength-guider.com/how-it-works');

    view.unmount();
    expect(canonical()).toBe('https://www.strength-guider.com/original');
  });

  it('survives a head with none of the expected tags', () => {
    // index.html is not this file's to guarantee, and a missing tag must not
    // white-screen a public page
    expect(() =>
      render(<Page title="Guide" description="A guide" path="/how-it-works" />)
    ).not.toThrow();
    expect(document.title).toBe('Guide');
  });
});
