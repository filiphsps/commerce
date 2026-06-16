import '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { queries, render, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Pass-through render wrapper for isolated test renders. The admin no longer needs a session
 * provider in unit tests — components read auth through Clerk hooks/`auth()`, which specs mock
 * directly — so this contributes no chrome.
 *
 * @param props.children - The component tree to wrap.
 */
const Providers = ({ children }: { children: ReactNode }) => <>{children}</>;

const customScreen = within(document.body, queries);
/**
 * Scopes Testing Library queries to a given element using the standard query set.
 *
 * @param element - The element to scope queries to.
 * @returns A queries object bound to the provided element.
 */
const customWithin = (element: ReactElement) => within(element as unknown as HTMLElement, queries);
/**
 * Renders a component wrapped in the test SessionProvider with null session.
 *
 * @param ui - The React element to render.
 * @param options - Optional render options forwarded to Testing Library render, excluding queries.
 * @returns The Testing Library render result.
 */
const customRender = (ui: Parameters<typeof render>[0], options?: Omit<Parameters<typeof render>[1], 'queries'>) =>
    render(ui, { wrapper: Providers, ...options });

export * from '@testing-library/react';
export { customRender as render, customScreen as screen, customWithin as within };
