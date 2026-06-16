import type { ComponentProps, ElementType, ReactNode, RefObject } from 'react';
import { cn } from '@/utils/tailwind';

export type InputProps<T extends ElementType = 'input'> = {
    as?: T;
    ref?: RefObject<HTMLInputElement | null>;
} & ComponentProps<T>;
/**
 * Polymorphic single-line input with consistent focus and disabled styles. Carries the shared,
 * tenant-themeable `focus-ring` so a bare input keeps a visible keyboard focus indicator (WCAG 2.4.7)
 * — the previous `focus:outline-none` removed the native outline with no replacement. Callers that
 * render focus on a wrapping element can override via `className`.
 *
 * @param props.as - Element or component to render; defaults to `input`.
 * @param props.ref - Forwarded ref for the underlying `HTMLInputElement`.
 * @param props.className - Additional class names.
 * @returns The rendered input element.
 */
const Input = <T extends ElementType = 'input'>({
    as: Tag = 'input' as T,
    ref,
    className,
    ...props
}: InputProps<T>) => {
    return (
        <Tag
            ref={ref}
            {...(props as ComponentProps<T>)}
            draggable={false}
            className={cn(
                'focus-ring w-full appearance-none rounded-lg',
                (props as { disabled?: boolean }).disabled && 'pointer-events-none cursor-not-allowed',
                className,
            )}
        />
    );
};
Input.displayName = 'Nordcom.Input';

export type MultilineInputProps<T extends ElementType> = {
    as?: ElementType;

    children: ReactNode;
} & ComponentProps<T>;
/**
 * Multiline text input (textarea by default) with consistent styling. Carries the shared
 * `focus-ring` so keyboard focus stays visible (WCAG 2.4.7) instead of the suppressed native outline.
 *
 * @param props.as - Element or component to render; defaults to `textarea`.
 * @param props.children - Content rendered inside the element.
 * @param props.className - Additional class names.
 * @returns The rendered textarea element.
 */
const MultilineInput = <T extends ElementType>({
    as: Tag = 'textarea' as T,
    children,
    className,
    ...props
}: MultilineInputProps<T>) => {
    return (
        <Tag
            draggable={false}
            {...props}
            className={cn(
                'focus-ring w-full resize-none appearance-none rounded-md border-primary bg-(--surface-0) p-2 text-xs',
                className,
            )}
        >
            {children}
        </Tag>
    );
};
MultilineInput.displayName = 'Nordcom.MultilineInput';

export { Input, MultilineInput };
