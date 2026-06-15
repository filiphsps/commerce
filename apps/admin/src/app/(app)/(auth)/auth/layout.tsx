import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Nordcom Commerce`,
    },
};

/**
 * Auth route-group layout. The login and logout screens own their full-viewport chrome via
 * {@link AuthShell}, so this layer only contributes the shared title template and passes children
 * through untouched — wrapping them in a constrained card here would double up the chrome.
 *
 * @param props.children - The auth screen subtree.
 * @returns The children, unwrapped.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
