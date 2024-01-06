import styles from '#/components/header.module.scss';
import { getSession } from '#/utils/auth';
import { Button } from '@nordcom/nordstar';
import Image from 'next/image';
import Link from 'next/link';
import type { HTMLProps } from 'react';

export type HeaderProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default async function Header({ className, ...props }: HeaderProps) {
    const session = await getSession();

    return (
        <header {...props} className={`${styles.container} ${className || ''}`}>
            <div className={styles.content}>
                <Link href="/" title="Nordcom Commerce" className={styles['logo-wrapper']}>
                    <Image
                        className={`${styles.logo}`}
                        src="/logo.svg"
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
                        <Link href="/">Home</Link>
                        <Link href="/news/" prefetch={false}>
                            News
                        </Link>
                        <Link href="/docs/" prefetch={false}>
                            Documentation
                        </Link>
                    </div>

                    {!session ? (
                        <Button as={Link} href="/login/" className={styles.button}>
                            Login
                        </Button>
                    ) : (
                        <Button as={Link} href="/admin/shop/" className={styles.button}>
                            Dashboard
                        </Button>
                    )}
                </nav>
            </div>
        </header>
    );
}
