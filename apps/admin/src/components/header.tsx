import { cn } from '@/utils/tailwind';
import Image from 'next/image';
import Link from 'next/link';

import { ToggleSidebar } from '@/components/toggle-sidebar';

import type { HTMLAttributes } from 'react';

export type HeaderProps = {} & HTMLAttributes<HTMLDivElement>;
export function Header({ className, children, ...props }: HeaderProps) {
    return (
        <header
            className={cn(
                'bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border top-0 z-40 flex items-center justify-between border-0 border-b-2 border-solid p-4 backdrop-blur lg:sticky',
                className
            )}
            {...props}
        >
            <Link href="/" title="Nordcom Commerce">
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
            </Link>

            <div className="flex gap-2">
                {children}

                <ToggleSidebar />
            </div>
        </header>
    );
}
