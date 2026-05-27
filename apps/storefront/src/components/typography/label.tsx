import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

export type LabelPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    styled?: boolean;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
};

export type LabelProps<ComponentGeneric extends ElementType> = LabelPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof LabelPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

/**
 * Small all-caps bold label for headings, field labels, and UI metadata.
 *
 * @param props.children - Label text or nodes; returns `null` when absent.
 * @param props.as - Rendered element type; defaults to `p`.
 * @param props.className - Additional class names.
 * @returns The label element, or `null` when `children` is falsy.
 */
export const Label = <ComponentGeneric extends ElementType = 'p'>({
    children,
    as,
    className,
    ...props
}: LabelProps<ComponentGeneric>) => {
    if (!children) {
        return null;
    }

    const Tag = as ?? 'p';

    return (
        <Tag {...props} className={cn('block font-extrabold text-sm uppercase leading-tight', className)}>
            {children}
        </Tag>
    );
};
