import { cn } from '@/utils/tailwind';

import Link from '@/components/link';

import type { HTMLProps } from 'react';

type InfoBarProps = {} & HTMLProps<HTMLDivElement>;
export const InfoBar = ({ className, ...props }: InfoBarProps) => {
    return (
        <section
            {...props}
            className={cn(
                'mx-auto flex h-8 max-w-[var(--page-width)] items-center justify-between gap-1 bg-white px-2 py-1',
                className
            )}
        >
            <div className="flex gap-2 *:text-sm *:leading-none">
                <div>Contact:</div>
                <div className="flex gap-1">
                    <Link href="phone:">Phone</Link>
                    <div>|</div>
                    <Link href="mailto:">Email</Link>
                </div>
            </div>

            <div className="flex gap-2 *:text-sm *:leading-none">
                <div className="flex gap-1">
                    <div className="font-bold">Private</div>
                    <div>|</div>
                    <Link href="/business/">Business</Link>
                </div>
            </div>
        </section>
    );
};
