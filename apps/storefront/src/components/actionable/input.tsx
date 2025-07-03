import { cn } from '@/utils/tailwind';

import type { ComponentProps, ElementType, HTMLProps, ReactNode, RefObject } from 'react';

export type InputProps<T extends ElementType> = {
    as?: ElementType;
    ref?: RefObject<HTMLInputElement | any>;
} & HTMLProps<HTMLInputElement> &
    ComponentProps<T>;
const Input = <T extends ElementType = ElementType<'input'>>({
    as: Tag = 'input' as T,
    ref,
    className,
    ...props
}: InputProps<T>) => {
    return (
        <Tag
            ref={ref}
            {...props}
            draggable={false}
            className={cn(
                'w-full appearance-none rounded-lg focus:outline-none focus:ring-0',
                props.disabled && 'pointer-events-none cursor-not-allowed',
                className
            )}
        />
    );
};
Input.displayName = 'Nordcom.Input';

export type MultilineInputProps<T extends ElementType> = {
    as?: ElementType;

    children: ReactNode;
} & ComponentProps<T>;
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
                'border-primary w-full resize-none appearance-none rounded-md bg-white p-2 text-xs focus:outline-none focus:ring-0',
                className
            )}
        >
            {children as any}
        </Tag>
    );
};
MultilineInput.displayName = 'Nordcom.MultilineInput';

export { Input, MultilineInput };
