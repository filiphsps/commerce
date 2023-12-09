import { getSession } from '#/utils/auth';
import { getShopForUser } from '#/utils/fetchers';
import { Button, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
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
            <Heading level="h1">{shop.name}</Heading>
            <Heading level="h2">{shop.domain}</Heading>

            <div className={styles.blocks}>
                <Card className={styles.block}>
                    <Label>collaborators</Label>
                    <div className={styles.collaborators}>
                        {shop.collaborators.map(({ user: { name } }) => (
                            <Button key={name} className={styles.collaborator}>
                                {name}
                            </Button>
                        ))}
                    </div>
                </Card>
            </div>
        </section>
    );
}
