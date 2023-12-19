import { getSession } from '#/utils/auth';
import { getShopForUser } from '#/utils/fetchers';
import { Button, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FiChevronRight, FiTrash2 } from 'react-icons/fi';
import styles from '../page.module.scss';

export type ShopPageProps = {
    params: {
        id: string;
    };
};

export async function generateMetadata({ params: { id: shopId } }: ShopPageProps): Promise<Metadata> {
    const session = await getSession();
    if (!session) {
        return redirect('/login/');
    }

    const shop = await getShopForUser(session.user.id, shopId);
    if (!shop) {
        return notFound();
    }
    return {
        title: `${shop.name}`,
        robots: {
            follow: true,
            index: false
        }
    };
}

export default async function Shop({ params: { id: shopId } }: ShopPageProps) {
    const session = await getSession();
    if (!session) {
        return redirect('/login/');
    }

    const shop = await getShopForUser(session.user.id, shopId);
    if (!shop) {
        return notFound();
    }

    return (
        <section className={`${styles.container}`}>
            <div>
                <Heading level="h1">{shop.name}</Heading>
                <Heading level="h3" as="h2">
                    {shop.domain}
                </Heading>
            </div>

            <div className={styles['split-view']}>
                <main>
                    <Label>Overview</Label>
                    <Card></Card>
                </main>

                <aside className={styles.blocks}>
                    <div className={styles.block}>
                        <Label>Settings</Label>

                        <div className={styles.settings}>
                            <Card className={styles.setting} as={Link} href="#">
                                Details
                                <Button as="div" variant="outline" className={styles.action}>
                                    <FiChevronRight />
                                </Button>
                            </Card>
                            <Card className={styles.setting} as={Link} href="#">
                                Branding
                                <Button as="div" variant="outline" className={styles.action}>
                                    <FiChevronRight />
                                </Button>
                            </Card>
                            <Card className={styles.setting} as={Link} href="#">
                                Design
                                <Button as="div" variant="outline" className={styles.action}>
                                    <FiChevronRight />
                                </Button>
                            </Card>
                            <Card className={styles.setting} as={Link} href="#">
                                Extensions
                                <Button as="div" variant="outline" className={styles.action}>
                                    <FiChevronRight />
                                </Button>
                            </Card>
                            <Card className={styles.setting} as={Link} href="#">
                                Billing
                                <Button as="div" variant="outline" className={styles.action}>
                                    <FiChevronRight />
                                </Button>
                            </Card>
                        </div>
                    </div>

                    <div className={styles.block}>
                        <Label>Collaborators</Label>

                        <div className={styles.settings}>
                            {shop.collaborators.map(({ user: { name } }) => (
                                <Card key={name} className={styles.setting}>
                                    {name}

                                    <Button variant="outline" className={styles.action}>
                                        <FiTrash2 />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}
