import styles from '@/components/actionable/input.module.scss';

import type { As } from '@nordcom/nordstar';

import type { ComponentProps, ElementType, ReactNode } from 'react';

export type InputProps<T extends As> = {
    as?: As;

    children: ReactNode;
} & ComponentProps<T>;
const Input = <T extends As = ElementType<'input'>>({
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

export type MultilineInputProps<T extends As> = {
    as?: As;

    children: ReactNode;
} & ComponentProps<T>;
const MultilineInput = <T extends As = ElementType<'textarea'>>({
    as: Tag = 'textarea' as T,
    children,
    className,
    ...props
}: MultilineInputProps<T>) => {
    return (
        <Tag draggable={false} {...props} className={`${styles.textarea}${className ? ` ${className}` : ''}`}>
            {children}
        </Tag>
    );
};
MultilineInput.displayName = 'Nordcom.MultilineInput';

export { Input, MultilineInput };
