import styles from '@/components/header.module.scss';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Card, Header as NordstarHeader, Label } from '@nordcom/nordstar';

import { auth } from '@/auth';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import type { HTMLProps } from 'react';

export type HeaderProps = {
    shop: OnlineShop;
} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'color'>;
export default async function Header({ shop, className, ...props }: HeaderProps) {
    try {
        const session = await auth();
        if (!session?.user) {
            redirect('/auth/login/');
        }

        return (
            <NordstarHeader {...props} className={`${styles.header} ${className || ''}`}>
                <NordstarHeader.Logo>
                    <Link href="/" title="Nordcom Commerce" className={styles['logo-wrapper']}>
                        <Image
                            className={styles.logo}
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
