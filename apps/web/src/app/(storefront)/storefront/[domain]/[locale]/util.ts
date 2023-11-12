import { BuildConfig } from '@/utils/build-config';
import { redirect } from 'next/navigation';

export const RedirectToLocale = async ({ handle }: { handle: string[] | undefined }) => {
    const path = (handle || []).join('/');
    const destination = `/${BuildConfig.i18n.default}/${path}`;

    return redirect(destination);
};
