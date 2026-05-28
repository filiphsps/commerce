'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X as XIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';
import type { LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations } from '@/utils/locale';

/**
 * Full-screen dialog modal that closes when the user navigates back.
 *
 * @param props.i18n - Locale dictionary for the close button label.
 * @param props.title - Dialog title displayed in the header strip.
 * @param props.description - Visually hidden description for assistive technology.
 * @param props.children - Modal body content; returns `null` when absent.
 * @returns The Radix `Dialog.Root` modal, or `null` when there are no children.
 */
export function Modal({
    i18n,
    title,
    description,
    children,
}: {
    i18n: LocaleDictionary;
    title: ReactNode;
    description: ReactNode;
    children: ReactNode;
}) {
    const router = useRouter();

    const pathname = usePathname();
    const [originalPathName] = useState(pathname);

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
                    <div className="pointer-events-none fixed inset-0 z-30 flex h-dvh max-h-dvh flex-col items-center justify-center overflow-y-scroll">
                        <VisuallyHidden.Root>
                            <Dialog.Description>{description}</Dialog.Description>
                        </VisuallyHidden.Root>

                        <div className="m-2 flex h-full min-h-dvh w-[calc(100%-1rem)] max-w-lg snap-y snap-mandatory scroll-py-2 flex-col items-stretch justify-stretch gap-2 overflow-x-hidden scroll-smooth bg-transparent md:w-full md:max-w-full md:snap-none md:gap-3">
                            <div className="pointer-events-auto z-10 mt-[16.5vh] flex snap-end snap-always items-center justify-between gap-3 rounded-lg border border-gray-200 border-solid bg-white p-2 px-3 leading-none drop-shadow md:mx-auto md:mt-4 md:-mb-6 md:w-full md:max-w-[calc(var(--page-width)/1.1)] md:border-none md:px-4 md:pt-3 md:pb-0 md:drop-shadow-none lg:mt-4">
                                <Dialog.Title asChild={true}>
                                    <Label className="line-clamp-1 font-bold text-current leading-none">{title}</Label>
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
