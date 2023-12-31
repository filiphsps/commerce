import 'server-only';

import { getSession } from '#/utils/auth';
import { getShop, updateShop } from '#/utils/fetchers';
import { Button, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

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

    return (
        <>
            <section>
                <Heading level="h2" as="h2">
                    Branding
                </Heading>
                <Card
                    as="form"
                    action={async (form: FormData) => {
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

                    <Button type="submit" color="primary" variant="outline">
                        Save
                    </Button>
                </Card>
            </section>

            <section>
                <Heading level="h2" as="h2">
                    Design
                </Heading>
                <Card></Card>
            </section>
        </>
    );
}
