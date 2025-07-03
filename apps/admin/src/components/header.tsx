import { Header as NordstarHeader } from '@nordcom/nordstar';

import { cn } from '@/utils/tailwind';
import Image from 'next/image';
import Link from 'next/link';

import { ToggleSidebar } from '@/components/toggle-sidebar';

import type { HTMLAttributes } from 'react';

export type HeaderProps = {} & HTMLAttributes<HTMLDivElement>;
export function Header({ className, children, ...props }: HeaderProps) {
    return (
        <NordstarHeader
            {...props}
            className={cn('[&>div>*]:px-1 [&>div]:max-w-full [&>div]:grid-cols-[auto_1fr_auto]', className)}
        >
            <NordstarHeader.Menu className="w-min">
                <ToggleSidebar />
            </NordstarHeader.Menu>

            <NordstarHeader.Logo as={Link} href="/" title="Nordcom Commerce" className="block w-fit">
                <Image
                    className="h-8 object-contain object-left"
                    src="https://shops.nordcom.io/logo.svg"
                    alt="Nordcom AB's Logo"
                    height={75}
                    width={150}
                    draggable={false}
                    decoding="async"
                    priority={true}
                    loader={undefined}
                />
            </NordstarHeader.Logo>

            <NordstarHeader.Menu className="w-full">{children}</NordstarHeader.Menu>
        </NordstarHeader>
    );
}
