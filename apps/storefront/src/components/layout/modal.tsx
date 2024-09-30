'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';

import { capitalize, getTranslations } from '@/utils/locale';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import { Card } from '@/components/layout/card';
import { Label } from '@/components/typography/label';

import type { LocaleDictionary } from '@/utils/locale';

export function ModalCard({ children = null }: { children?: ReactNode }) {
    return (
        <Card className="pointer-events-auto flex w-full max-w-lg snap-start snap-normal flex-col gap-1 bg-white p-2 drop-shadow last:mb-2 md:mx-auto md:w-full md:max-w-[calc(var(--page-width)/1.1)] md:p-4">
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
    }, []);

    if (!children) {
        return null;
    }

    const { t } = getTranslations('common', i18n);

    return (
        <Dialog.Root open={pathname === originalPathName} defaultOpen={true} onOpenChange={() => router.back()}>
            <Dialog.Portal>
                <Dialog.Overlay className="absolute inset-0 z-20 h-full w-full select-none place-items-center bg-black/80" />
                <Dialog.Content asChild={true}>
                    <div className="relative inset-0 z-50 flex min-h-fit flex-col items-center justify-center overflow-y-auto overscroll-contain">
                        <VisuallyHidden.Root>
                            <Dialog.Description>{description}</Dialog.Description>
                        </VisuallyHidden.Root>

                        <div className="pointer-events-none fixed left-[calc(50%-0.5rem)] top-[calc(50%-0.5rem)] z-10 m-2 flex h-full min-h-full w-[calc(100%-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] snap-y snap-mandatory scroll-py-2 flex-col items-stretch justify-stretch gap-2 overflow-x-hidden scroll-smooth md:w-full md:max-w-full md:snap-none md:gap-3">
                            <div className="pointer-events-auto z-10 mt-[16.5vh] flex snap-end snap-always items-center justify-between gap-3 rounded-lg border border-solid border-gray-200 bg-white p-2 px-3 leading-none drop-shadow md:mx-auto md:-mb-6 md:mt-[10vh] md:w-full md:max-w-[calc(var(--page-width)/1.1)] md:border-none md:px-4 md:pb-0 md:pt-3 md:drop-shadow-none">
                                <Dialog.Title asChild={true}>
                                    <Label className="line-clamp-1 font-bold leading-none text-current">{title}</Label>
                                </Dialog.Title>

                                <Dialog.Close asChild={true}>
                                    <Button
                                        title={capitalize(t('close'))}
                                        className="flex size-5 items-center justify-end text-right text-gray-600 drop-shadow transition-colors hover:text-black"
                                        styled={false}
                                    >
                                        <FiX className="size-full stroke-2 text-inherit" />
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
