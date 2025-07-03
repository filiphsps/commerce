'use client';

import { Card } from '@nordcom/nordstar';

import { X } from 'lucide-react';
import { useRouter } from 'next/router';

import type { ReactNode } from 'react';

export function Modal({ title, children }: { title: ReactNode; children: ReactNode }) {
    const router = useRouter();

    return (
        <Card as="aside" className="bg-black">
            <Card.Header className="flex items-center justify-between">
                {title}

                <button
                    onClick={() => router.back()}
                    className="hover:text-primary flex appearance-none items-center justify-center border-none bg-transparent outline-none transition-colors"
                >
                    <X />
                </button>
            </Card.Header>

            <Card.Divider />

            {children as any}
        </Card>
    );
}
