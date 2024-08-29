import { Accented, Button, Heading, Label } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { getShopsForUser } from '@/utils/fetchers';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { user } = session;
    const shops = await getShopsForUser(user.id!);

    const firstName = user.name?.split(' ').at(0) || null;
    const lastName = user.name?.split(' ').slice(1).join(' ') || null;

    const shopsActions = shops.map((shop) => (
        <Button key={shop.id} variant="solid" as={Link} href={`/${shop.domain}/`}>
            {shop.name}
        </Button>
    ));

    return (
        <div className="">
            <Link href="/" title="Nordcom Commerce">
                <Image
                    src="https://shops.nordcom.io/logo.svg"
                    alt="Nordcom AB's Logo"
                    height={75}
                    width={150}
                    draggable={false}
                    decoding="async"
                    priority={true}
                    loader={undefined}
                />
            </Link>

            <Label as="div">
                Hi <Accented>{firstName || 'there'}</Accented> {lastName || ''}
            </Label>

            <Heading level="h1">Choose a Shop</Heading>

            {shopsActions}

            <Button variant="solid" color="primary" disabled>
                Connect a new Shop
            </Button>
        </div>
    );
}
