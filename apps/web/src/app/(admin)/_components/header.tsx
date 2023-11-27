import { Button } from '#/components/button';
import styles from '#/components/header.module.scss';
import Image from 'next/image';
import Link from 'next/link';
import type { HTMLProps } from 'react';

export type HeaderProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function Header({ className, ...props }: HeaderProps) {
    return (
        <header {...props} className={`${styles.container} ${className || ''}`}>
            <div className={styles.content}>
                <Link href="/" title="Nordcom Commerce" className={styles['logo-wrapper']}>
                    <Image
                        className={`${styles.logo}`}
                        src="https://nordcom.io/logo.svg"
                        alt="Nordcom Group Inc.'s Logo"
                        height={75}
                        width={150}
                        priority
                        draggable={false}
                    />
                </Link>

                <nav className={styles.nav} draggable={false}>
                    <div className={styles.links}>
                        <Link href="/">Home</Link>
                        <Link href="/news/">News</Link>
                        <Link href="/docs/">Documentation</Link>
                    </div>

                    <Button as={Link} href="/login/" className={styles.button}>
                        Login
                    </Button>
                </nav>
            </div>
        </header>
    );
}
