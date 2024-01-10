import styles from '@/components/header.module.scss';
import logo from '@/static/logo.svg';
import { getSession } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';
import { Card, Label } from '@nordcom/nordstar';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { HTMLProps } from 'react';

export type HeaderProps = {
    shopId: string;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default async function Header({ shopId, className, ...props }: HeaderProps) {
    const session = await getSession();
    if (!session) {
        return redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    return (
        <header {...props} className={`${styles.container} ${className || ''}`}>
            <div className={styles.content}>
                <Link href="/" title="Nordcom Commerce" className={styles['logo-wrapper']}>
                    <Image
                        className={styles.logo}
                        src={logo}
                        alt="Nordcom Group Inc.'s Logo"
                        height={75}
                        width={150}
                        draggable={false}
                        decoding="async"
                        priority={true}
                    />
                </Link>

                <nav className={styles.nav} draggable={false}>
                    <Card as={Link} href="/" className={styles.button}>
                        <Label className={styles.label}>{shop.name}</Label>

                        {shop.icons?.favicon?.src ? (
                            <Image className={styles.icon} src={shop.icons.favicon.src} alt="" height={25} width={25} />
                        ) : null}
                    </Card>
                </nav>
            </div>
        </header>
    );
}
