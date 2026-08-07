import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library does not auto-clean under globals:true in every version, and
// a leaked DOM makes the next test's queries match the previous test's markup.
afterEach(() => {
  cleanup();
});
