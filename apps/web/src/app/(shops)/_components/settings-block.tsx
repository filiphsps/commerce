import { Button, Card } from '@nordcom/nordstar';
import type { ReactNode } from 'react';
import styles from './settings-block.module.scss';

export type SettingsBlockProps = {
    save: (data: FormData) => Promise<void>;

    actionButtonLabel?: string;
    children?: ReactNode;
};
const SettingsBlock = ({ save, actionButtonLabel, children }: SettingsBlockProps) => {
    return (
        <Card
            className={styles.container}
            as="form"
            action={async (data: FormData) => {
                'use server';

                return save(data);
            }}
        >
            {children}

            <Button type="submit" color="default" variant="outline">
                {actionButtonLabel || 'Save'}
            </Button>
        </Card>
    );
};

SettingsBlock.displayName = 'Nordcom.Admin.SettingsBlock';
export { SettingsBlock };
