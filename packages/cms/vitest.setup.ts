import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

// @testing-library/react no longer auto-cleans under Vitest 4; editor-ui tests
// call render() multiple times per file and rely on a fresh body each time.
afterEach(() => {
    if (typeof document === 'undefined') return;
    cleanup();
    document.body.innerHTML = '';
});
