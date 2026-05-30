'use client';

import { Mail as MailIcon } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { EmailShareButton, FacebookShareButton, TwitterShareButton } from 'react-share';

import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';

const SHARE_BUTTON_STYLES =
    'focus-ring z-10 flex h-8 w-8 appearance-none items-center justify-center rounded-full border-2 border-(--border-strong) border-solid bg-(--surface-2) text-(color:var(--text)) transition-colors hover:border-(color:var(--accent)) hover:text-(color:var(--accent)) md:h-9 md:w-9';

export type ProductGalleryShareProps = {
    pageUrl: string;
    title?: string;
    i18n: LocaleDictionary;
    actions?: ReactNode | ReactNode[];
};

/**
 * Email/Facebook/X share buttons for the product gallery, split into its own chunk.
 *
 * `react-share` pulls a heavy tree of per-network helpers that no longer belongs in the gallery's
 * initial client bundle. The gallery lazy-mounts this via `dynamic(..., { ssr: false })`, so the
 * dependency only loads when the share cluster actually renders.
 *
 * @param props.pageUrl - Canonical product URL forwarded to each share network.
 * @param props.title - Share title (SEO title or vendor/title fallback) passed to the buttons.
 * @param props.i18n - Locale dictionary for the share control labels.
 * @param props.actions - Additional action nodes rendered below the share buttons.
 * @returns The vertical stack of share buttons.
 */
export const ProductGalleryShare = ({ pageUrl, title, i18n, actions }: ProductGalleryShareProps) => {
    const { t } = getTranslations('common', i18n);

    return (
        <div className="flex flex-col gap-2 empty:hidden md:gap-1">
            <EmailShareButton
                key="email"
                url={pageUrl}
                className={SHARE_BUTTON_STYLES}
                resetButtonStyle={false}
                title={title}
                htmlTitle={t('share-via-email')}
            >
                <MailIcon className="stroke-2" />
            </EmailShareButton>
            <FacebookShareButton
                key="facebook"
                url={pageUrl}
                className={SHARE_BUTTON_STYLES}
                resetButtonStyle={false}
                title={title}
                htmlTitle={t('share-on-facebook')}
            >
                <Image
                    className="stroke-2"
                    src="/assets/icons/social/facebook-outline.svg"
                    alt="Facebook"
                    width={20}
                    height={20}
                />
            </FacebookShareButton>
            <TwitterShareButton
                key="twitter"
                url={pageUrl}
                className={SHARE_BUTTON_STYLES}
                resetButtonStyle={false}
                title={title}
                htmlTitle={t('share-on-x')}
            >
                <Image
                    className="stroke-2"
                    src="/assets/icons/social/twitter-outline.svg"
                    alt="X (Twitter)"
                    width={20}
                    height={20}
                />
            </TwitterShareButton>

            {actions}
        </div>
    );
};

ProductGalleryShare.displayName = 'Nordcom.Products.GalleryShare';
