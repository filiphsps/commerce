'use client';

import { Card, Input, Label } from '@nordcom/nordstar';
import type { ShopTheme as ShopThemeValue } from '@prisma/client/edge';
import styles from './settings.module.scss';

// TODO: Get this from the database package.
export type ShopTheme = {
    header: {
        theme: 'primary' | 'secondary';
        themeVariant: 'default' | 'light' | 'dark';
    };
};

export type CommerceSettingsProps = {
    data: ShopThemeValue | null;
};

const ThemeSettings = ({ data: settings }: CommerceSettingsProps) => {
    const data = (
        typeof settings?.data === 'object' ? settings?.data : JSON.parse(settings?.data?.toString() || 'null')
    ) as ShopTheme | null;

    return (
        <>
            <Card className={styles.section}>
                <Label>Header</Label>

                <Input
                    as="select"
                    type="select"
                    name="header.theme"
                    title="Theme"
                    label="Theme"
                    defaultValue={data?.header.theme || 'primary'}
                    value={undefined}
                >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                </Input>

                <Input
                    as="select"
                    type="select"
                    name="header.themeVariant"
                    title="Theme Variant"
                    label="Theme Variant"
                    defaultValue={data?.header.themeVariant || 'default'}
                    value={undefined}
                >
                    <option value="default">Default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </Input>
            </Card>
        </>
    );
};

ThemeSettings.displayName = 'Nordcom.Admin.Settings.ThemeSettings';
export { ThemeSettings };
