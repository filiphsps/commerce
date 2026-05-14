import type { ComponentProps, ElementType, ReactNode } from 'react';

export type ContentProps<T extends ElementType = 'article'> = {
    children?: ReactNode;
    as?: T;
} & Omit<ComponentProps<T>, 'as'>;
export const Content = <T extends ElementType = 'article'>({ children, as, className, ...props }: ContentProps<T>) => {
    const AsComponent: ElementType = as || 'article';

    return (
        <AsComponent
            {...props}
            className={[
                'prose prose-invert max-w-none',
                'mt-7',
                'prose-headings:font-medium prose-headings:text-foreground',
                "prose-h3:font-extrabold prose-h3:uppercase prose-h3:after:content-['.']",
                'prose-code:bg-transparent prose-code:font-normal prose-code:text-brand',
                'prose-blockquote:border-brand prose-blockquote:border-l-4 prose-blockquote:bg-[hsl(0_0%_15%)] prose-blockquote:px-4 prose-blockquote:py-2',
                'prose-a:underline prose-a:decoration-[0.075em] hover:prose-a:text-brand',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {children || null}
        </AsComponent>
    );
};
