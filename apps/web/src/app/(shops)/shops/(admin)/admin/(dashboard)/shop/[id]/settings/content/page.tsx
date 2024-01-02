import 'server-only';

import { SettingsBlock } from '#/components/settings-block';
import { getSession } from '#/utils/auth';
import {
    getCheckoutProvider,
    getCommerceProvider,
    getContentProvider,
    getShop,
    updateCheckoutProvider,
    updateCommerceProvider,
    updateContentProvider
} from '#/utils/fetchers';
import { UnknownCommerceProviderError } from '@/utils/errors';
import { Button, Card, Heading, Label } from '@nordcom/nordstar';
import { ContentProviderType } from '@prisma/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CommerceSettings } from './commerce-settings';

export const revalidate = 30;
// FIXME: Find a better way than to make every child page dynamic.
export const dynamic = 'force-dynamic';

export type ShopSettingsContentPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Content'
};

export default async function ShopSettingsContentPage({ params: { id: shopId } }: ShopSettingsContentPageProps) {
    const session = await getSession();
    if (!session) return null;

    const { user } = session;

    const shop = await getShop(user.id, shopId);
    if (!shop) {
        notFound();
    }

    const commerceProvider = await getCommerceProvider(user.id, shopId);

    const contentProvider = await getContentProvider(user.id, shopId);
    const defaultContentData = JSON.stringify(
        {
            id: '',
            repository: '',
            authentication: {
                token: ''
            }
        },
        null,
        0
    );

    const checkoutProvider = await getCheckoutProvider(user.id, shopId);
    const defaultCheckoutData = JSON.stringify({}, null, 0);

    return (
        <>
            <section>
                <Heading level="h2" as="h2">
                    Commerce
                </Heading>
                <SettingsBlock
                    save={async (form: FormData) => {
                        'use server';

                        const type = form.get('type')?.toString().toLowerCase() as ContentProviderType;

                        let data;
                        switch (type) {
                            case 'shopify': {
                                data = {
                                    id: form.get('shopId')?.toString() || undefined,
                                    domain: form.get('domain')?.toString() || undefined,
                                    storefrontId: form.get('storefrontId')?.toString() || undefined,
                                    authentication: {
                                        token: form.get('token')?.toString() || undefined,
                                        publicToken: form.get('publicToken')?.toString() || undefined,

                                        customers: {
                                            id: form.get('customersShopifyAccountsId')?.toString() || undefined,
                                            clientId: form.get('customersClientId')?.toString() || undefined,
                                            clientSecret: form.get('customersClientSecret')?.toString() || undefined
                                        }
                                    }
                                };
                                break;
                            }

                            default: {
                                throw new UnknownCommerceProviderError();
                            }
                        }

                        console.debug(`Updating commerce provider`, JSON.stringify({ type, data }, null, 4));
                        await updateCommerceProvider(user.id, shopId, { type, data });
                    }}
                >
                    <CommerceSettings data={commerceProvider || null} />
                </SettingsBlock>
            </section>

            <section>
                <Heading level="h2" as="h2">
                    Content
                </Heading>
                <Card
                    as="form"
                    action={async (form: FormData) => {
                        'use server';

                        const type = form.get('type')?.toString().toLowerCase();
                        const data = JSON.stringify(
                            JSON.parse(form.get('data')?.toString() || defaultContentData),
                            null,
                            0
                        );

                        console.debug(`Updating content provider`, { type, data });
                        await updateContentProvider(user.id, shopId, { type, data });
                    }}
                >
                    <Label as="label" htmlFor="type">
                        Type
                    </Label>
                    <Card as="select" name="type" title="Type" defaultValue={contentProvider?.type}>
                        {Object.values(ContentProviderType).map((e) => (
                            <option key={e} value={e}>
                                {e}
                            </option>
                        ))}
                    </Card>

                    <Label as="label" htmlFor="data">
                        Data
                    </Label>
                    <Card
                        as="textarea"
                        name="data"
                        title="Data"
                        defaultValue={JSON.stringify(
                            JSON.parse(contentProvider?.data?.toString() || defaultContentData),
                            null,
                            4
                        )}
                    />

                    <Button type="submit" color="primary" variant="outline">
                        Save
                    </Button>
                </Card>
            </section>

            <section>
                <Heading level="h2" as="h2">
                    Checkout
                </Heading>
                <Card
                    as="form"
                    action={async (form: FormData) => {
                        'use server';

                        const type = form.get('type')?.toString().toLowerCase();
                        const data = JSON.stringify(
                            JSON.parse(form.get('data')?.toString() || defaultCheckoutData),
                            null,
                            0
                        );

                        console.debug(`Updating checkout provider`, { type, data });
                        await updateCheckoutProvider(user.id, shopId, { type, data });
                    }}
                >
                    <Label as="label" htmlFor="type">
                        Type
                    </Label>
                    <Card as="select" name="type" title="Type" defaultValue={checkoutProvider?.type || 'shopify'}>
                        <option value="shopify">Shopify</option>
                        <option value="shopify-and-stripe">Shopify with Stripe Fallback</option>
                    </Card>

                    <Label as="label" htmlFor="data">
                        Data
                    </Label>
                    <Card
                        as="textarea"
                        name="data"
                        title="Data"
                        defaultValue={JSON.stringify(
                            JSON.parse(checkoutProvider?.data?.toString() || defaultCheckoutData),
                            null,
                            4
                        )}
                    />

                    <Button type="submit" color="primary" variant="outline">
                        Save
                    </Button>
                </Card>
            </section>
        </>
    );
}
