import { useEffect } from 'react';

/**
 * Per-route document metadata.
 *
 * Every route served the same title and description out of index.html, so How
 * It Works presented itself to search engines and link previews as the home
 * page. That is the whole reason its content was earning nothing.
 *
 * Done by hand rather than with a helmet library: the app needs four fields on
 * five public routes, and a dependency for that would be larger than the code.
 * Crawlers that run JavaScript pick these up; ones that do not still get the
 * index.html defaults, which describe the product rather than nothing.
 */

const SITE = 'https://strengthguider.com';

interface PageMeta {
  title: string;
  description: string;
  /** Path, not a full URL. Leading slash included, e.g. "/how-it-works". */
  path: string;
}

function setMeta(selector: string, attribute: string, value: string): string | null {
  const element = document.head.querySelector(selector);
  if (!element) return null;
  const previous = element.getAttribute(attribute);
  element.setAttribute(attribute, value);
  return previous;
}

function setCanonical(href: string): { element: HTMLLinkElement; previous: string | null; added: boolean } {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (element) {
    const previous = element.getAttribute('href');
    element.setAttribute('href', href);
    return { element, previous, added: false };
  }
  element = document.createElement('link');
  element.rel = 'canonical';
  element.href = href;
  document.head.appendChild(element);
  return { element, previous: null, added: true };
}

export function usePageMeta({ title, description, path }: PageMeta): void {
  useEffect(() => {
    const url = `${SITE}${path}`;
    const previousTitle = document.title;
    document.title = title;

    // Restored on unmount so that navigating away from a public page does not
    // leave its description attached to the next one
    const restore: Array<() => void> = [];
    const track = (selector: string, attribute: string, value: string) => {
      const previous = setMeta(selector, attribute, value);
      if (previous !== null) {
        restore.push(() => setMeta(selector, attribute, previous));
      }
    };

    track('meta[name="description"]', 'content', description);
    track('meta[property="og:title"]', 'content', title);
    track('meta[property="og:description"]', 'content', description);
    track('meta[property="og:url"]', 'content', url);
    track('meta[name="twitter:title"]', 'content', title);
    track('meta[name="twitter:description"]', 'content', description);

    const canonical = setCanonical(url);

    return () => {
      document.title = previousTitle;
      restore.forEach((undo) => undo());
      if (canonical.added) {
        canonical.element.remove();
      } else if (canonical.previous !== null) {
        canonical.element.setAttribute('href', canonical.previous);
      }
    };
  }, [title, description, path]);
}
