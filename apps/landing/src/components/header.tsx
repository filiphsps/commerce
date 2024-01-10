import styles from '@/components/header.module.scss';
import logo from '@/static/logo.svg';
import { Button } from '@nordcom/nordstar';
import Image from 'next/image';
import Link from 'next/link';
import type { HTMLProps } from 'react';

export type HeaderProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default async function Header({ className, ...props }: HeaderProps) {
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
                    <div className={styles.links}>
                        <Link href="/news/" prefetch={false}>
                            News
                        </Link>
                        <Link href="/docs/" prefetch={false}>
                            Documentation
                        </Link>
                    </div>

                    <Button as={Link} href="/admin/" prefetch={false} className={styles.button}>
                        Admin
                    </Button>
                </nav>
            </div>
        </header>
    );
}
