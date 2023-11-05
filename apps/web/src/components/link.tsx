import BaseLink from 'next/link';
import { BuildConfig } from '@/utils/build-config';
import type { ComponentProps } from 'react';
import NProgress from 'nprogress';
import { NextLocaleToLocale } from '@/utils/locale';
import { usePathname } from 'next/navigation';

type Props = Omit<ComponentProps<typeof BaseLink>, 'locale'> & {};

// FIXME: Do this properly.
export default function Link({ ...props }: Props) {
    const route = usePathname();
    const locale = NextLocaleToLocale(route?.split('/').at(1) || BuildConfig.i18n.default); // FIXME: Handle this properly.

    // FIXME: Handle this ASAP.
    if (!locale) return null;

    let href = props.href.toString();
    if (!href.includes(':') && href.startsWith('/')) {
        // TODO: Check if lang is already a part of the URL.
        href = `/${locale.locale}${props.href}`.replaceAll('//', '');
    }

    return <BaseLink {...props} href={href} onClick={() => NProgress.start()} />;
}
