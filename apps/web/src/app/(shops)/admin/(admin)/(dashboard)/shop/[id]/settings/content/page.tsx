import 'server-only';

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
import { Button, Card, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

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
        return notFound();
    }

    const commerceProvider = await getCommerceProvider(user.id, shopId);
    const defaultCommerceData = JSON.stringify(
        {
            domain: '',
            storefrontId: '',
            authentication: {
                token: '',
                publicToken: '',

                customers: {
                    id: '',
                    clientId: '',
                    clientSecret: ''
                }
            }
        },
        null,
        0
    );

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
                <Label>Commerce</Label>
                <Card
                    as="form"
                    action={async (form: FormData) => {
                        'use server';

                        const type = form.get('type')?.toString().toLowerCase();
                        const data = JSON.stringify(
                            JSON.parse(form.get('data')?.toString() || defaultCommerceData),
                            null,
                            0
                        );

                        console.debug(`Updating commerce provider`, { type, data });
                        await updateCommerceProvider(user.id, shopId, { type, data });
                    }}
                >
                    <Label as="label" htmlFor="type">
                        Type
                    </Label>
                    <Card as="select" name="type" title="Type" defaultValue={commerceProvider?.type || 'shopify'}>
                        <option value="shopify">Shopify</option>
                        <option value="stripe">Stripe</option>
                    </Card>

                    <Label as="label" htmlFor="data">
                        Data
                    </Label>
                    <Card
                        as="textarea"
                        name="data"
                        title="Data"
                        defaultValue={JSON.stringify(
                            JSON.parse(commerceProvider?.data?.toString() || defaultCommerceData),
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
                <Label>Content</Label>
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
                    <Card as="select" name="type" title="Type" defaultValue={contentProvider?.type || 'prismic'}>
                        <option value="prismic">Prismic</option>
                        <option value="shopify">Shopify</option>
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
                <Label>Checkout</Label>
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
