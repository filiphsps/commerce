import styles from '@/components/header.module.scss';
import { auth } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';
import { Card, Label, Header as NordstarHeader } from '@nordcom/nordstar';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import type { HTMLProps } from 'react';

export type HeaderProps = {
    shopId: string;
} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'color'>;
export default async function Header({ shopId, className, ...props }: HeaderProps) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    return (
        <NordstarHeader {...props} className={`${styles.header} ${className || ''}`}>
            <NordstarHeader.Logo>
                <Link href="/" title="Nordcom Commerce" className={styles['logo-wrapper']}>
                    <Image
                        className={styles.logo}
                        src="https://shops.nordcom.io/logo.svg"
                        alt="Nordcom Group Inc.'s Logo"
                        height={75}
                        width={150}
                        draggable={false}
                        decoding="async"
                        priority={true}
                        loader={undefined}
                    />
                </Link>
            </NordstarHeader.Logo>

            <NordstarHeader.Menu className={styles.menu} draggable={false}>
                <Card as={Link} href="/" className={styles.button}>
                    <Label className={styles.label}>{shop.name}</Label>

                    {/*shop.icons?.favicon?.src ? (
                        <Image className={styles.icon} src={shop.icons.favicon.src} alt="" height={25} width={25} />
                    ) : null*/}
                </Card>
            </NordstarHeader.Menu>
        </NordstarHeader>
    );
}
