import 'server-only';

import styles from './settings.module.scss';

import { notFound, redirect } from 'next/navigation';

import { Card, Heading, Input, Label } from '@nordcom/nordstar';

import { auth } from '@/utils/auth';
import { getShop, getShopTheme, updateShop, updateShopTheme } from '@/utils/fetchers';

import { SettingsBlock } from '@/components/settings-block';

import { ThemeSettings } from './theme-settings';

import type { Metadata } from 'next';

export const revalidate = 30;

export type ShopSettingsDesignPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Design'
};

export default async function ShopSettingsDesignPage({ params: { id: shopId } }: ShopSettingsDesignPageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    const shopTheme = await getShopTheme(session.user.id, shopId);
    const defaultShopTheme = {
        header: {
            theme: 'primary',
            themeVariant: 'default'
        }
    };

    return (
        <>
            <section>
                <Heading level="h2" as="h2">
                    Branding
                </Heading>
                <SettingsBlock
                    save={async (form: FormData) => {
                        'use server';

                        const session = await auth();
                        if (!session?.user?.id) {
                            redirect('/auth/login/');
                        }

                        const name = form.get('name')?.toString()!;
                        const domain = form.get('domain')?.toString()!;

                        console.debug(`Updating shop`, { name, domain });
                        await updateShop(session.user.id, shopId, { name, domain });
                    }}
                >
                    <Card className={styles.section} padding={false} borderless>
                        <Label as="label" htmlFor="name">
                            Name
                        </Label>
                        <Input name="name" title="Name" defaultValue={shop.name} />
                    </Card>

                    <Card className={styles.section} padding={false} borderless>
                        <Label as="label" htmlFor="domain">
                            Domain
                        </Label>
                        <Input name="domain" title="Domain" defaultValue={shop.domain} />
                    </Card>

                    <Card className={styles.section} padding={false} borderless>
                        <Label as="label" htmlFor="accents">
                            Accents
                        </Label>
                        <Card className={styles.container}>
                            {shop.design.accents.map(({ type, color, foreground }, index) => (
                                <Card key={`accent_${index}`} className={styles.section} padding={false} borderless>
                                    <Label as="label">{type} (Accent)</Label>
                                    <Card className={styles.grid}>
                                        <div className={styles.item}>
                                            <Label as="label" htmlFor={`accent_${index}_type`}>
                                                Type
                                            </Label>
                                            <Input
                                                as="select"
                                                name={`accent_${index}_type`}
                                                type="select"
                                                title="Type"
                                                label="Type"
                                                defaultValue={type}
                                            >
                                                {['primary', 'secondary'].map((value) => (
                                                    <option key={value} value={value}>
                                                        {value}
                                                    </option>
                                                ))}
                                            </Input>
                                        </div>

                                        <div className={styles.item}>
                                            <Label as="label" htmlFor={`accent_${index}`}>
                                                Color
                                            </Label>
                                            <Input
                                                as="input"
                                                name={`accent_${index}`}
                                                type="color"
                                                title="Color"
                                                defaultValue={color}
                                            />
                                        </div>

                                        <div className={styles.item}>
                                            <Label as="label" htmlFor={`accent_${index}_foreground`}>
                                                Text
                                            </Label>
                                            <Input
                                                as="input"
                                                name={`accent_${index}_foreground`}
                                                type="color"
                                                title="Foreground"
                                                defaultValue={foreground}
                                            />
                                        </div>
                                    </Card>
                                </Card>
                            ))}
                        </Card>
                    </Card>
                </SettingsBlock>
            </section>

            <section>
                <Heading level="h2" as="h2">
                    Theme
                </Heading>
                <SettingsBlock
                    save={async (form: FormData) => {
                        'use server';

                        const session = await auth();
                        if (!session?.user?.id) {
                            redirect('/auth/login/');
                        }

                        const data = {
                            header: {
                                theme: form.get('header.theme')?.toString() || defaultShopTheme.header.theme,
                                themeVariant:
                                    form.get('header.themeVariant')?.toString() || defaultShopTheme.header.themeVariant
                            }
                        };

                        console.debug(`Updating shop theme`, JSON.stringify({ data }, null, 4));
                        await updateShopTheme(session.user.id, shopId, { data });
                    }}
                >
                    <ThemeSettings data={shopTheme || null} />
                </SettingsBlock>
            </section>
        </>
    );
}
