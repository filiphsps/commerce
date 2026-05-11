import '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { queries, render, within } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import type { ReactElement, ReactNode } from 'react';

const Providers = ({ children }: { children: ReactNode }) => (
    <SessionProvider session={null}>{children}</SessionProvider>
);

const customScreen = within(document.body, queries);
const customWithin = (element: ReactElement) => within(element as unknown as HTMLElement, queries);
const customRender = (ui: Parameters<typeof render>[0], options?: Omit<Parameters<typeof render>[1], 'queries'>) =>
    render(ui, { wrapper: Providers, ...options });

export * from '@testing-library/react';
export { customRender as render, customScreen as screen, customWithin as within };
