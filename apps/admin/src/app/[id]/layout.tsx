import 'server-only';

import Footer from '@/components/footer';
import Header from '@/components/header';
import { getSession } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';
import { Button, Card, Label, View } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BiBook, BiCreditCardFront, BiHomeAlt, BiImage, BiRocket } from 'react-icons/bi';
import styles from './layout.module.scss';

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
        return redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    const basePath = `/${shopId}`;

    return (
        <div className={styles.container}>
            <Header shopId={shopId} />

            <View className={styles.content}>
                <div className={styles['split-view']}>
                    <main className={styles.page}>{children}</main>

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
            </View>

            <Footer />
        </div>
    );
}
