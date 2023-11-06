import { BuildConfig } from '@/utils/build-config';
import { redirect } from 'next/navigation';

export type NoLocalePageParams = { handle: string[] | undefined };

export const RedirectToLocale = async ({ handle }: NoLocalePageParams) => {
    const path = (handle || []).join('/');
    const destination = `/${BuildConfig.i18n.default}/${path}`;

    return redirect(destination);
};
