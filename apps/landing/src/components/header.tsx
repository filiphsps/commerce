import styles from '@/components/header.module.scss';

import { Button, Header as NordstarHeader } from '@nordcom/nordstar';

import logo from '@/static/logo.svg';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';
import Link from 'next/link';

import type { HTMLProps } from 'react';

export type HeaderProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children' | 'color'>;
export default async function Header({ className, ...props }: HeaderProps) {
    return (
        <NordstarHeader
            {...props}
            className={cn(
                'top-0 w-full [grid-area:header] *:w-screen [&>div>*]:px-1 [&>div]:max-w-[var(--layout-page-width)] [&>div]:grid-cols-[auto_1fr_auto]',
                className
            )}
        >
            <NordstarHeader.Logo>
                <Link href="/" title="Nordcom Commerce">
                    <Image
                        className={styles.logo}
                        src={logo}
                        alt="Nordcom AB's Logo"
                        height={75}
                        width={150}
                        draggable={false}
                        decoding="async"
                        priority={true}
                    />
                </Link>
            </NordstarHeader.Logo>

            <NordstarHeader.Menu className={styles.menu}>
                <NordstarHeader.Menu.Link as={Link} href="/news/">
                    News
                </NordstarHeader.Menu.Link>
                <NordstarHeader.Menu.Link as={Link} href="/docs/">
                    Documentation
                </NordstarHeader.Menu.Link>

                <Button as={Link} href="https://admin.shops.nordcom.io/">
                    Admin
                </Button>
            </NordstarHeader.Menu>
        </NordstarHeader>
    );
}
