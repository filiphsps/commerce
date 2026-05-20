// apps/docs/mdx-components.tsx
import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs';
import { ApiReference } from '@/components/api/api-reference';

const themeComponents = getThemeComponents();

export function useMDXComponents(components?: Record<string, unknown>) {
    return { ...themeComponents, ApiReference, ...components };
}
