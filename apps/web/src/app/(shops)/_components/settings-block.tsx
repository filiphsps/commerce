'use client';

import { Button, Card } from '@nordcom/nordstar';
import type { ElementType, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './settings-block.module.scss';

export type SettingsBlockProps = {
    as?: ElementType;
    save: (data: FormData) => Promise<void>;

    actionButtonIcon?: ReactNode;
    actionButtonLabel?: string;
    children?: ReactNode;
};
const SettingsBlock = ({ as, save, ...props }: SettingsBlockProps) => {
    const Tag = as || Card;
    return (
        <Tag className={styles.container} as="form" action={save}>
            <SettingsBlockContent {...props} />
        </Tag>
    );
};

const SettingsBlockContent = ({
    actionButtonIcon,
    actionButtonLabel,
    children
}: Pick<SettingsBlockProps, 'actionButtonLabel' | 'actionButtonIcon' | 'children'>) => {
    const { pending } = useFormStatus();

    const label = pending ? 'Working...' : actionButtonLabel || 'Save';
    return (
        <>
            {children}

            <Button
                disabled={pending}
                aria-disabled={pending}
                type="submit"
                color="default"
                variant="outline"
                icon={actionButtonIcon || null}
            >
                {label}
            </Button>
        </>
    );
};

SettingsBlock.displayName = 'Nordcom.Admin.SettingsBlock';
export { SettingsBlock };
