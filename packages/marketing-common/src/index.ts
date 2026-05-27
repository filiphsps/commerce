import type { NordstarTheme } from '@nordcom/nordstar';

/**
 * Nordstar design system theme for the marketing applications, pinning the brand accent colors and CSS variable font references.
 *
 * @example
 * ```tsx
 * import { Theme } from '@nordcom/commerce-marketing-common';
 * import { NordstarProvider } from '@nordcom/nordstar';
 *
 * <NordstarProvider theme={Theme}>
 *     {children}
 * </NordstarProvider>
 * ```
 */
export const Theme: NordstarTheme = {
    accents: {
        primary: '#ed1e79',
        secondary: '#ed1e79',
    },
    fonts: {
        heading: 'var(--font-primary)',
        body: 'var(--font-primary)',
    },
};
