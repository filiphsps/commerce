import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { HTMLProps } from 'react';
import type { Locale, LocaleDictionary } from '@/utils/locale';

type InfoBarProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;

/**
 * Info bar was sourced from Prismic's `menu` document. With Prismic removed,
 * the bar is hidden until the CMS Header global gains equivalent fields
 * (showInfoBar / email / phone) and a getter is wired up here.
 *
 * Follow-up: read from `getHeader` (@nordcom/commerce-cms/api) and render
 * email / phone / locale switcher from the recursive nav-item field.
 */
export async function InfoBar(_props: InfoBarProps) {
    return null;
}
