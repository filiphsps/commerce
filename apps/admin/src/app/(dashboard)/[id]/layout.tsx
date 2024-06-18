import 'server-only';

import styles from './layout.module.scss';

import { BiBook, BiCreditCardFront, BiHomeAlt, BiImage, BiRocket, BiStats, BiWrench } from 'react-icons/bi';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Button, Card, Heading, Label, View } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { getShop } from '@/utils/fetchers';

import Footer from '@/components/footer';
import Header from '@/components/header';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export type ShopLayoutProps = {
    children: ReactNode;
    params: {
        id: string;
    };
};

export async function generateMetadata({ params: { id: shopId } }: ShopLayoutProps): Promise<Metadata> {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id!, shopId);
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
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id!, shopId);
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
                            <Label className={styles['section-title']}>
                                <BiStats />
                                Analytics
                            </Label>

                            <div className={styles.settings}>
                                <Card className={styles.setting} as={Link} href={`${basePath}/`}>
                                    <Heading level="h4" as="div">
                                        Overview
                                    </Heading>
                                    <Button as="div" variant="outline" className={styles.action}>
                                        <BiHomeAlt />
                                    </Button>
                                </Card>
                            </div>
                        </div>

                        <div className={styles.block}>
                            <Label className={styles['section-title']}>
                                <BiWrench />
                                Settings
                            </Label>

                            <div className={styles.settings}>
                                <Card className={styles.setting} as={Link} href={`${basePath}/settings/content/`}>
                                    <Heading level="h4" as="div">
                                        Content
                                    </Heading>
                                    <Button as="div" variant="outline" className={styles.action}>
                                        <BiBook />
                                    </Button>
                                </Card>

                                <Card className={styles.setting} as={Link} href={`${basePath}/settings/design/`}>
                                    <Heading level="h4" as="div">
                                        Branding & Theme
                                    </Heading>
                                    <Button as="div" variant="outline" className={styles.action}>
                                        <BiImage />
                                    </Button>
                                </Card>

                                <Card className={styles.setting} as={Link} href={`${basePath}/settings/billing/`}>
                                    <Heading level="h4" as="div">
                                        Billing
                                    </Heading>
                                    <Button as="div" variant="outline" className={styles.action}>
                                        <BiCreditCardFront />
                                    </Button>
                                </Card>
                            </div>
                        </div>

                        <div className={styles.block}>
                            <Label className={styles['section-title']}>
                                <BiRocket />
                                Collaborators
                            </Label>

                            <div className={styles.settings}>
                                {shop.collaborators.map(({ user: { id, name, avatar } }) => (
                                    <Card key={id} className={`${styles.setting} ${styles.collaborator}`}>
                                        {!!avatar ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={avatar}
                                                alt={name}
                                                height={35}
                                                width={35}
                                                draggable={false}
                                                decoding="async"
                                                className={styles.avatar}
                                            />
                                        ) : (
                                            <div className={styles.avatar}>{name.at(0)}</div>
                                        )}

                                        <Label as="div">{name}</Label>
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
