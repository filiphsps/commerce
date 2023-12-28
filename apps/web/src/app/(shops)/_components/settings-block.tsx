import { Button, Card } from '@nordcom/nordstar';
import type { ReactNode } from 'react';

export type SettingsBlockProps = {
    save: (data: FormData) => Promise<void>;

    children: ReactNode;
};
const SettingsBlock = ({ save, children }: SettingsBlockProps) => {
    return (
        <Card
            as="form"
            action={async (data: FormData) => {
                'use server';

                return save(data);
            }}
        >
            {children}

            <Button
                type="submit"
                color="primary"
                variant="outline"
                style={{ marginTop: 'var(--layout-block-padding)' }}
            >
                Save
            </Button>
        </Card>
    );
};

SettingsBlock.displayName = 'Nordcom.Admin.SettingsBlock';
export { SettingsBlock };
