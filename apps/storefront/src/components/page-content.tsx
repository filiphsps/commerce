import type { ElementType, HTMLProps, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

export type PageContentProps = {
    as?: ElementType;
    primary?: boolean;
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
/**
 * Polymorphic constrained-width content column used as the main page wrapper.
 *
 * @param props.as - Element or component to render; defaults to `div`.
 * @param props.primary - When `true`, applies min-height, grid-area, and full-page padding.
 * @param props.className - Additional CSS class names.
 * @param props.children - Page content; returns `null` when absent.
 * @returns The rendered content element, or `null` when there are no children.
 */
const PageContent = ({ as: Tag = 'div', primary, className, ...props }: PageContentProps) => {
    if (!props.children) {
        return null;
    }

    return (
        <Tag
            {...props}
            className={cn(
                'mx-auto flex w-screen max-w-full flex-col gap-2 text-base empty:hidden md:w-[var(--page-width)] md:max-w-full md:gap-4',
                primary && 'min-h-[calc(100dvh-14rem)] gap-8 p-2 [grid-area:content] md:gap-12 md:p-3',
                className,
            )}
        />
    );
};

PageContent.displayName = 'Nordcom.PageContent';
export default PageContent;
