import { BuildConfig } from '@/utils/build-config';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    robots: {
        follow: true,
        index: false
    }
};

export default async function NoLocalePage({}) {
    // TODO: Maybe allow for single-locale tenants.
    // FIXME: Properly detect the user's locale.
    return redirect(`/${BuildConfig.i18n.default}/`);
}
