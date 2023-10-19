import * as styles from '@/components/layout/header.css';

import Image from 'next/image';
import Link from 'next/link';
import MobileMenuToggle from './mobile-menu-toggle';
import { StoreModel } from '@/models/StoreModel';

export default async function Header({ store }: { store: StoreModel }) {
    return (
        <header className={styles.header}>
            <div className={styles.content}>
                <MobileMenuToggle />
                <Link href="/" prefetch={false} className={styles.logo}>
                    <Image
                        src={store?.logo?.src!}
                        width={250}
                        height={150}
                        alt={`Store logo`}
                        sizes="(max-width: 950px) 75px, 200px"
                        className={styles.logoImage}
                    />
                </Link>
            </div>
        </header>
    );
}
