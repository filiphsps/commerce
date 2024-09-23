import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Input, Label } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { Button } from '@/components/button';
import { Card } from '@/components/card';

import type { Metadata } from 'next';

export type ShopNewReviewPageProps = {
    params: {
        domain: string;
    };
};

export const metadata: Metadata = {
    title: 'New Review'
};

export default async function ShopNewReviewPagePage({ params: { domain } }: ShopNewReviewPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

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
                    <Card.header>
                        <Label>Create a new review</Label>
                    </Card.header>

                    <Card.content>
                        <div className="flex flex-col gap-3">
                            <Input type="text" name="product" label="Product" />

                            <Input type="number" min={1} max={5} defaultValue={5} name="rating" label="rating" />
                            <Input type="text" name="title" label="Title" />
                            <Input as="textarea" type="text" name="body" label="Body" className="min-h-72 resize-y" />
                        </div>
                    </Card.content>

                    <Card.footer>
                        <Button type="submit">Save</Button>
                    </Card.footer>
                </Card>
            </form>
        </>
    );
}
