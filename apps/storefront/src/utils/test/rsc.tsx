import type { ReactElement } from 'react';
import { render as customRender } from '@/utils/test/react';

/**
 * Render an async React Server Component for unit testing.
 *
 * Pattern:
 *   const ui = await renderRSC(() => <PrismicPage shop={...} ... />);
 *   expect(ui.getByText('hello')).toBeInTheDocument();
 *
 * Limitations:
 * - Components that call Next.js-specific runtime APIs (cookies, headers,
 *   draftMode) must mock those dependencies before invocation. This harness
 *   doesn't shim them.
 * - Suspense boundaries inside the RSC still need their data deps mocked at
 *   the import boundary, same as any other test.
 */
export async function renderRSC(factory: () => Promise<ReactElement> | ReactElement) {
    const node = await factory();
    return customRender(node);
}
