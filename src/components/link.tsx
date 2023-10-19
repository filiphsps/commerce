import BaseLink from 'next/link';
import type { ComponentProps } from 'react';
import { Config } from '@/utils/Config';
import NProgress from 'nprogress';
import { NextLocaleToLocale } from '@/utils/Locale';
import { usePathname } from 'next/navigation';

type Props = Omit<ComponentProps<typeof BaseLink>, 'locale'> & {};

export default function Link({ ...props }: Props) {
    const route = usePathname();
    const locale = NextLocaleToLocale(route?.split('/').at(1) || Config.i18n.default); // FIXME: Handle this properly.

    let href = props.href.toString();
    if (!href.includes(':') && href.startsWith('/')) {
        // TODO: Check if lang is already a part of the URL.
        href = `/${locale.locale}${props.href}`.replaceAll('//', '');
    }

    return <BaseLink {...props} href={href} onClick={() => NProgress.start()} />;
}
