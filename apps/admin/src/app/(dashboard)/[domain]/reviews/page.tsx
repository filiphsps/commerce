import 'server-only';

import { Review, Shop } from '@nordcom/commerce-db';
import { Button, Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/card';

import type { Metadata, Route } from 'next';

export type ShopReviewsPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'Reviews'
};

export default async function ShopReviewsPagePage({ params }: ShopReviewsPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain); // FIXME: Handle errors.
    const reviews = await Review.findByShop(shop.id!);

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading level="h1">Reviews</Heading>

                <Button as={Link} href={`/${domain}/reviews/new` as Route} variant="outline">
                    New review
                </Button>
            </div>

            {reviews.length > 0 ? (
                <Card>
                    <Card.header></Card.header>
                    <Card.content className="grid auto-rows-fr grid-cols-[1fr_1fr]"></Card.content>
                </Card>
            ) : (
                <Card>
                    <Card.content className="flex flex-col gap-3">
                        <h2 className="text-foreground/75 text-3xl font-normal lowercase leading-none">
                            Your reviews will appear here.
                        </h2>
                        <p className="text-base">
                            This is where you will manage, reply to and moderate reviews of your products and services.
                        </p>
                    </Card.content>
                </Card>
            )}
        </>
    );
}
