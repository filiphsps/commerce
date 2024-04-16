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

                        await updateShop(session.user.id, shopId, Object.fromEntries(form.entries()));
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
                        <Label as="label">Accents</Label>
                        <Card className={styles.container}>
                            {shop.design.accents.map(({ type, color, foreground }, index) => (
                                <Card key={`accents.${index}`} className={styles.section} padding={false} borderless>
                                    <Label as="label">{type} (Accent)</Label>
                                    <Card className={styles.grid}>
                                        <div className={styles.item}>
                                            <Label as="label" htmlFor={`accents.${index}.type`}>
                                                Type
                                            </Label>
                                            <Input
                                                as="select"
                                                name={`accents.${index}.type`}
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
                                            <Label as="label" htmlFor={`accents.${index}.color`}>
                                                Color
                                            </Label>
                                            <Input
                                                as="input"
                                                name={`accents.${index}.color`}
                                                type="color"
                                                title="Color"
                                                defaultValue={color}
                                            />
                                        </div>

                                        <div className={styles.item}>
                                            <Label as="label" htmlFor={`accents.${index}.foreground`}>
                                                Text
                                            </Label>
                                            <Input
                                                as="input"
                                                name={`accents.${index}.foreground`}
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

                    <Card className={styles.section} padding={false} borderless>
                        <Label as="label" htmlFor="icons">
                            Favicon
                        </Label>

                        <Card className={styles.grid}>
                            <img className={styles.preview} src={shop.icons?.favicon?.src!} alt="Favicon Preview" />
                            <Card className={styles.section} padding={false} borderless>
                                <Input
                                    label="src"
                                    name="icons.favicon.src"
                                    title="Favicon Src"
                                    defaultValue={shop.icons?.favicon?.src}
                                />
                            </Card>

                            <Card className={styles.section} padding={false} borderless>
                                <Input
                                    label="Alt"
                                    name="icons.favicon.alt"
                                    title="Favicon Alt"
                                    defaultValue={shop.icons?.favicon?.alt}
                                />
                            </Card>

                            <Card className={`${styles.section} ${styles.small}`} padding={false} borderless>
                                <Input
                                    label="width"
                                    type="number"
                                    name="icons.favicon.width"
                                    title="Favicon Width"
                                    defaultValue={shop.icons?.favicon?.width}
                                />
                            </Card>

                            <Card className={`${styles.section} ${styles.small}`} padding={false} borderless>
                                <Input
                                    label="height"
                                    type="number"
                                    name="icons.favicon.height"
                                    title="Favicon Height"
                                    defaultValue={shop.icons?.favicon?.height}
                                />
                            </Card>
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
