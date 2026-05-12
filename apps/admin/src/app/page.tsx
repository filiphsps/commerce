import { Accented, Button, Heading, Label } from '@nordcom/nordstar';
import { Settings } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getShopsForUser } from '@/utils/fetchers';

export const metadata: Metadata = {
    title: 'Your Shops',
};

export default async function Overview() {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/' as Route);
    }

    const { user } = session;
    const shops = await getShopsForUser(user.id!);

    const firstName = user.name?.split(' ').at(0) || null;
    const lastName = user.name?.split(' ').slice(1).join(' ') || null;

    const shopsActions = shops.map(({ id, domain, name }) => (
        <Button
            key={id}
            as={Link}
            href={`/${domain}` as Route}
            title={name}
            variant="outline"
            color="foreground"
            className="w-full"
        >
            {name}
        </Button>
    ));

    return (
        <main className="flex flex-col items-center justify-center">
            <article className="flex flex-col gap-3 rounded-2xl border-3 border-border border-solid p-3">
                <header className="flex flex-col">
                    <section className="flex items-start justify-between">
                        <Link href="/" title="Nordcom Commerce" className="block pb-4">
                            <Image
                                src="/logo.svg"
                                alt="Nordcom AB's Logo"
                                height={75}
                                width={150}
                                draggable={false}
                                decoding="async"
                                priority={true}
                                loader={undefined}
                            />
                        </Link>

                        <div>
                            <Link
                                href="/accounts"
                                className="flex w-5 overflow-hidden transition-colors hover:text-primary"
                            >
                                <Settings />
                            </Link>
                        </div>
                    </section>

                    <Label as="div">
                        Hi <Accented>{firstName || 'there'}</Accented> {lastName || ''}
                    </Label>
                    <Heading level="h1">Choose a Shop</Heading>
                </header>

                <section className="grid w-full grid-flow-row grid-cols-1 gap-2 py-2">{shopsActions}</section>

                <footer className="border-0 border-border border-t-3 border-solid pt-3">
                    <Button as={Link} href={'/new'} variant="solid" className="h-12 w-full">
                        Connect a new Shop
                    </Button>
                </footer>
            </article>
        </main>
    );
}
