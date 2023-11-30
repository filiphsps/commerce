'use client';

import type { Shop } from '@/api/shop';
import * as Prismic from '@/utils/prismic';
import { GoogleTagManager } from '@next/third-parties/google';
import { PrismicPreview } from '@prismicio/next';
import { useEffect, useState, type ReactNode } from 'react';

export type ThirdPartiesProviderProps = {
    shop: Shop;
    children: ReactNode;
};
export const ThirdPartiesProvider = ({ shop, children }: ThirdPartiesProviderProps) => {
    const [delayedContent, setDelayedContent] = useState<ReactNode>(null);
    useEffect(() => {
        if (!shop?.configuration?.thirdParty?.googleTagManager) {
            return () => {};
        }

        const timeout = setTimeout(() => {
            if (delayedContent || !shop?.configuration?.thirdParty?.googleTagManager) {
                return;
            }

            setDelayedContent(() => (
                <>
                    <GoogleTagManager gtmId={shop!.configuration!.thirdParty!.googleTagManager!} />
                    <PrismicPreview repositoryName={Prismic.repositoryName} />
                </>
            ));

            // Wait 6.75 seconds to prevent tag manager from destroying our ranking.
        }, 6_750);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <>
            {children}
            {delayedContent}
        </>
    );
};
