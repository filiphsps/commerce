import 'server-only';

import { revalidateTag } from 'next/cache';
import { notFound, redirect } from 'next/navigation';

import { Error } from '@nordcom/commerce-errors';
import { Button, Card, Heading } from '@nordcom/nordstar';

import { auth } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';

import type { Metadata } from 'next';

export type ShopPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Overview'
};

export default async function ShopPage({ params: { id: shopId } }: ShopPageProps) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            redirect('/auth/login/');
        }

        const shop = await getShop(session.user.id, shopId);

        return (
            <section>
                <Card>
                    <Heading level="h1">{shop.name}</Heading>
                    <Heading level="h4" as="h2">
                        Overview - {shop.domain}
                    </Heading>
                </Card>

                <Card>
                    <Button
                        onClick={async () => {
                            'use server';

                            const session = await auth();
                            if (!session?.user?.id) {
                                redirect('/auth/login/');
                            }

                            revalidateTag(session.user.id);
                            revalidateTag(shop.id);
                        }}
                    >
                        Revalidate
                    </Button>
                </Card>
            </section>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
