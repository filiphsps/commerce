import 'server-only';

import { SettingsBlock } from '#/components/settings-block';
import { getSession } from '#/utils/auth';
import { getShop } from '#/utils/fetchers';
import { Button, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { revalidateTag } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BiBook, BiCreditCardFront, BiHomeAlt, BiImage, BiRocket, BiUpload } from 'react-icons/bi';
import styles from '../page.module.scss';

export type ShopLayoutProps = {
    children: ReactNode;
    params: {
        id: string;
    };
};

export async function generateMetadata({ params: { id: shopId } }: ShopLayoutProps): Promise<Metadata> {
    const session = await getSession();
    if (!session) {
        return redirect('/login/');
    }

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    return {
        title: {
            default: 'Overview',
            template: `${shop.name} · %s · Nordcom Commerce`
        },
        robots: {
            follow: true,
            index: false
        }
    };
}

export default async function ShopLayout({ children, params: { id: shopId } }: ShopLayoutProps) {
    const session = await getSession();
    if (!session) {
        return redirect('/login/');
    }

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    const basePath = `/shop/${shopId}`;

    return (
        <section className={`${styles.container}`}>
            <div className={styles.heading}>
                <Heading level="h1">
                    <Link href={`https://${shop.domain}/`} target="_blank">
                        {shop.name}
                    </Link>
                </Heading>

                <div className={styles.sidebar}>
                    <SettingsBlock
                        as="form"
                        save={async () => {
                            'use server';
                            revalidateTag(shop.id);
                            revalidateTag(shop.domain);
                        }}
                        actionButtonIcon={<BiUpload />}
                        actionButtonLabel="Revalidate"
                    />
                </div>
            </div>

            <div className={styles['split-view']}>
                <main className={styles.content}>{children}</main>

                <aside className={styles.blocks}>
                    <div className={styles.block}>
                        <Label>Analytics</Label>

                        <div className={styles.settings}>
                            <Card className={styles.setting} as={Link} href={`${basePath}/`}>
                                Overview
                                <Button as="div" variant="outline" className={styles.action}>
                                    <BiHomeAlt />
                                </Button>
                            </Card>
                        </div>
                    </div>

                    <div className={styles.block}>
                        <Label>Settings</Label>

                        <div className={styles.settings}>
                            <Card className={styles.setting} as={Link} href={`${basePath}/settings/content/`}>
                                Content
                                <Button as="div" variant="outline" className={styles.action}>
                                    <BiBook />
                                </Button>
                            </Card>

                            <Card className={styles.setting} as={Link} href={`${basePath}/settings/design/`}>
                                Branding & Theme
                                <Button as="div" variant="outline" className={styles.action}>
                                    <BiImage />
                                </Button>
                            </Card>

                            <Card className={styles.setting} as={Link} href={`${basePath}/settings/billing/`}>
                                Billing
                                <Button as="div" variant="outline" className={styles.action}>
                                    <BiCreditCardFront />
                                </Button>
                            </Card>
                        </div>
                    </div>

                    <div className={styles.block}>
                        <Label>
                            <BiRocket />
                            Collaborators
                        </Label>

                        <div className={styles.settings}>
                            {shop.collaborators.map(({ user: { name } }) => (
                                <Card key={name} className={styles.setting}>
                                    {name}
                                </Card>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}
