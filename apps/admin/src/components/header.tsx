import { Header as NordstarHeader } from '@nordcom/nordstar';
import Image from 'next/image';
import Link from 'next/link';
import type { HTMLAttributes } from 'react';
import { ToggleSidebar } from '@/components/toggle-sidebar';
import logo from '@/static/logo.svg';
import { cn } from '@/utils/tailwind';

export type HeaderProps = {} & HTMLAttributes<HTMLDivElement>;
export function Header({ className, children, ...props }: HeaderProps) {
    return (
        <NordstarHeader
            {...props}
            className={cn('[&>div>*]:px-1 [&>div]:max-w-full [&>div]:grid-cols-[auto_1fr_auto]', className)}
        >
            <NordstarHeader.Menu className="md:hidden">
                <ToggleSidebar />
            </NordstarHeader.Menu>

            <NordstarHeader.Logo as={Link} href="/" title="Nordcom Commerce" className="block w-fit">
                <Image
                    className="h-full object-contain object-left"
                    src={logo}
                    alt="Nordcom Commerce Logo"
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
