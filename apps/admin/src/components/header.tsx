import styles from '@/components/header.module.scss';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Error } from '@nordcom/commerce-errors';
import { Card, Header as NordstarHeader, Label } from '@nordcom/nordstar';

import { auth } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';

import type { HTMLProps } from 'react';

export type HeaderProps = {
    shopId: string;
} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'color'>;
export default async function Header({ shopId, className, ...props }: HeaderProps) {
    try {
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
