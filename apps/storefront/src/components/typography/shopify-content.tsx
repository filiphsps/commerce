import { type ToReactNodesOptions, toReactNodes } from '@nordcom/commerce-shopify-html';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';

export type ShopifyContentProps<ComponentGeneric extends ElementType = 'div'> = {
    as?: ComponentGeneric;
    className?: string;
    html?: string | null;
    components?: ToReactNodesOptions['components'];
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'dangerouslySetInnerHTML'>;

const DEFAULT_COMPONENTS: ToReactNodesOptions['components'] = {
    a: Link as ElementType,
};

/**
 * Renders sanitized Shopify HTML as a React node tree.
 *
 * @param props.html - Raw HTML string from the Shopify storefront API.
 * @param props.as - Wrapper element type; defaults to `div`.
 * @param props.className - Additional class names applied to the wrapper.
 * @param props.components - Override map for HTML element renderers passed to `toReactNodes`.
 * @returns The rendered prose container, or `null` when `html` is empty.
 */
export const ShopifyContent = <ComponentGeneric extends ElementType = 'div'>({
    as,
    className,
    html,
    components,
    ...props
}: ShopifyContentProps<ComponentGeneric>) => {
    const nodes = toReactNodes(html, { components: components ?? DEFAULT_COMPONENTS });
    if (!nodes) return null;

    const AsComponent = (as ?? 'div') as ElementType;

    return (
        <AsComponent
            {...props}
            className={cn(
                'prose prose-headings:text-pretty prose-strong:font-extrabold prose-a:text-inherit prose-headings:text-inherit text-current prose-a:no-underline *:text-inherit empty:hidden',
                className,
            )}
        >
            {nodes}
        </AsComponent>
    );
};
