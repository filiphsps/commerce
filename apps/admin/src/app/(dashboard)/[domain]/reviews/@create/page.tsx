import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Button, Card, Input, Label } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export type ShopNewReviewPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'New Review'
};

export default async function ShopNewReviewPagePage({ params }: ShopNewReviewPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain); // FIXME: Handle errors.

    return (
        <>
            <form
                action={async (formData: FormData) => {
                    'use server';
                    // TODO: Implement this.
                    console.warn(formData, shop.domain);
                }}
            >
                <Card>
                    <Card.Header>
                        <Label>Create a new review</Label>
                    </Card.Header>

                    <div className="flex flex-col gap-3">
                        <Input type="text" name="product" label="Product" />

                        <Input type="number" min={1} max={5} defaultValue={5 as any} name="rating" label="rating" />
                        <Input type="text" name="title" label="Title" />
                        <Input as="textarea" name="body" label="Body" className="min-h-72 resize-y" />
                    </div>

                    <Button type="submit">Save</Button>
                </Card>
            </form>
        </>
    );
}
