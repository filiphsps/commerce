'use client';

import type { Shop } from '@/api/shop';
import { Locale } from '@/utils/locale';
import BaseLink from 'next/link';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof BaseLink>, 'locale'> & {
    shop?: Shop;
    locale?: Locale;
};

// FIXME: i18n provider?
export default function Link({ shop, locale, href, prefetch, ...props }: Props) {
    // TODO: Use a more sensible fallback.
    locale = locale || Locale.current;

    return <BaseLink {...props} href={href} locale={locale.code} prefetch={prefetch || false} />;
}
