import styles from '@/components/actionable/input.module.scss';

import { cn } from '@/utils/tailwind';

import type { ComponentProps, ElementType, ReactNode } from 'react';

export type InputProps<T extends ElementType> = {
    as?: ElementType;

    children: ReactNode;
} & ComponentProps<T>;
const Input = <T extends ElementType = ElementType<'input'>>({
    as: Tag = 'input' as T,
    children,
    className,
    ...props
}: InputProps<T>) => {
    return (
        <Tag draggable={false} {...props} className={`${styles.input}${className ? ` ${className}` : ''}`}>
            {children}
        </Tag>
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
                styles.textarea,
                'border-primary outline-primary w-full resize-none appearance-none rounded-md bg-white p-2 text-xs outline outline-0 focus:outline-2',
                className
            )}
        >
            {children}
        </Tag>
    );
};
MultilineInput.displayName = 'Nordcom.MultilineInput';

export { Input, MultilineInput };
