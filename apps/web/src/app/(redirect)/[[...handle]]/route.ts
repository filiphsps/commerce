import { BuildConfig } from '@/utils/build-config';
import { redirect } from 'next/navigation';

export type NoLocalePageParams = { handle: string[] | undefined };

export const RedirectToLocale = async ({ handle }: NoLocalePageParams) => {
    const path = (handle || []).join('/');
    const destination = `/${BuildConfig.i18n.default}/${path}`;

    return redirect(destination);
};

// TODO: Maybe allow for single-locale tenants?
// FIXME: properly detect the user's locale.
export async function GET(request: Request, { params }: { params: NoLocalePageParams }) {
    console.log('|[', request.url);
    if (request.url.includes('_next')) return null;

    return RedirectToLocale({ handle: params?.handle });
}
