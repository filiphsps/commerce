/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { capitalize, getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X as XIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import { Card } from '@/components/layout/card';
import { Label } from '@/components/typography/label';

import type { LocaleDictionary } from '@/utils/locale';

export function ModalCard({ children = null, className }: { children?: ReactNode; className?: string }) {
    return (
        <Card
            className={cn(
                'pointer-events-auto flex w-full max-w-lg snap-start snap-normal flex-col gap-1 bg-white p-2 drop-shadow last:mb-2 md:mx-auto md:w-full md:max-w-[calc(var(--page-width)/1.1)] md:p-4',
                className
            )}
        >
            {children}
        </Card>
    );
}

export function Modal({
    i18n,
    title,
    description,
    children
}: {
    i18n: LocaleDictionary;
    title: ReactNode;
    description: ReactNode;
    children: ReactNode;
}) {
    const router = useRouter();

    const pathname = usePathname();
    const [originalPathName, setOriginalPathName] = useState(pathname);
    useEffect(() => {
        setOriginalPathName(pathname);
    }, [pathname]);

    if (!children) {
        return null;
    }

    const { t } = getTranslations('common', i18n);

    return (
        <Dialog.Root
            open={pathname === originalPathName}
            defaultOpen={true}
            onOpenChange={() => router.back()}
            modal={true}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="absolute inset-0 z-20 h-full w-full select-none place-items-center bg-black/80" />
                <Dialog.Content asChild={true}>
                    <div className="pointer-events-none fixed inset-0 z-30 flex h-screen max-h-screen flex-col items-center justify-center overflow-y-scroll">
                        <VisuallyHidden.Root>
                            <Dialog.Description>{description}</Dialog.Description>
                        </VisuallyHidden.Root>

                        <div className="fixed left-[calc(50%-0.5rem)] top-[calc(50%-0.5rem)] m-2 flex h-full min-h-screen w-[calc(100%-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] snap-y snap-mandatory scroll-py-2 flex-col items-stretch justify-stretch gap-2 overflow-x-hidden scroll-smooth bg-transparent md:w-full md:max-w-full md:snap-none md:gap-3">
                            <div className="pointer-events-auto z-10 mt-[16.5vh] flex snap-end snap-always items-center justify-between gap-3 rounded-lg border border-solid border-gray-200 bg-white p-2 px-3 leading-none drop-shadow [-webkit-overflow-scrolling:touch] md:mx-auto md:-mb-6 md:mt-4 md:w-full md:max-w-[calc(var(--page-width)/1.1)] md:border-none md:px-4 md:pb-0 md:pt-3 md:drop-shadow-none lg:mt-4">
                                <Dialog.Title asChild={true}>
                                    <Label className="line-clamp-1 font-bold leading-none text-current">{title}</Label>
                                </Dialog.Title>

                                <Dialog.Close asChild={true}>
                                    <Button
                                        title={capitalize(t('close'))}
                                        className="flex size-5 items-center justify-end text-right text-gray-600 drop-shadow transition-colors hover:text-black"
                                        styled={false}
                                    >
                                        <XIcon className="size-full stroke-2 text-inherit" />
                                    </Button>
                                </Dialog.Close>
                            </div>

                            {children}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
