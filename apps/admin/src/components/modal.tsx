'use client';

import { Card } from '@nordcom/nordstar';

import { X } from 'lucide-react';
import { useRouter } from 'next/router';

import type { ReactNode } from 'react';

/**
 * Generic modal card with a close button that navigates back in the router history.
 *
 * @param props.title - Content rendered in the card header alongside the close button.
 * @param props.children - Body content rendered inside the card.
 */
export function Modal({ title, children }: { title: ReactNode; children: ReactNode }) {
    const router = useRouter();

    return (
        <Card as="aside" className="bg-black">
            <Card.Header className="flex items-center justify-between">
                {title}

                <button
                    onClick={() => router.back()}
                    className="flex appearance-none items-center justify-center border-none bg-transparent outline-none transition-colors hover:text-primary"
                >
                    <X />
                </button>
            </Card.Header>

            <Card.Divider />

            {children}
        </Card>
    );
}
