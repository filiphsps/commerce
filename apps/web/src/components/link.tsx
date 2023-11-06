'use client';

import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale } from '@/utils/locale';
import BaseLink from 'next/link';
import { useMemo, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof BaseLink>, 'locale'> & {};

// FIXME: i18n provider?
export default function Link({ ...props }: Props) {
    const locale = DefaultLocale();

    let href = props.href.toString();
    if ((!href.includes(':') && href.startsWith('/')) || href.includes(BuildConfig.domain)) {
        // Remove our own domain from the URL.
        href = href.replaceAll(`https://${BuildConfig.domain}/`, '');

        // Check if any lang (xx-YY) is already a part of the URL.
        if (!/\/[a-z]{2}-[A-Z]{2}\//.test(href)) {
            // Add locale to href.
            href = `/${locale.locale}${href}`;
        }

        // Fix all occurrences of double slashes.
        href = href.replaceAll('//', '');
    }

    if (props.href || href) props.href = href;
    const component = useMemo(() => <BaseLink {...props} />, [props.href]);

    return component;
}
