import 'server-only';

import { SettingsBlock } from '@/components/settings-block';
import { getSession } from '@/utils/auth';
import { getShop, getShopTheme, updateShop, updateShopTheme } from '@/utils/fetchers';
import { Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ThemeSettings } from './theme-settings';

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
    const session = await getSession();
    if (!session) return null;

    const { user } = session;

    const shop = await getShop(user.id, shopId);
    if (!shop) {
        notFound();
    }

    const shopTheme = await getShopTheme(user.id, shopId);
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

                        const name = form.get('name')?.toString()!;
                        const domain = form.get('domain')?.toString()!;

                        console.debug(`Updating shop`, { name, domain });
                        await updateShop(user.id, shopId, { name, domain });
                    }}
                >
                    <Label as="label" htmlFor="name">
                        Name
                    </Label>
                    <Card as="input" name="name" title="Name" defaultValue={shop.name} />

                    <Label as="label" htmlFor="domain">
                        Domain
                    </Label>
                    <Card as="input" name="domain" title="Domain" defaultValue={shop.domain} />
                </SettingsBlock>
            </section>

            <section>
                <Heading level="h2" as="h2">
                    Theme
                </Heading>
                <SettingsBlock
                    save={async (form: FormData) => {
                        'use server';

                        const data = {
                            header: {
                                theme: form.get('header.theme')?.toString() || defaultShopTheme.header.theme,
                                themeVariant:
                                    form.get('header.themeVariant')?.toString() || defaultShopTheme.header.themeVariant
                            }
                        };

                        console.debug(`Updating shop theme`, JSON.stringify({ data }, null, 4));
                        await updateShopTheme(user.id, shopId, { data });
                    }}
                >
                    <ThemeSettings data={shopTheme || null} />
                </SettingsBlock>
            </section>
        </>
    );
}
