import { NextResponse } from 'next/server';
import { RedirectToLocale } from './util';

export type NoLocalePageParams = { handle: string[] | undefined };

// TODO: Maybe allow for single-locale tenants?
// FIXME: properly detect the user's locale.
export async function GET(request: Request, { params }: { params: NoLocalePageParams }) {
    if (request.url.includes('_next')) return NextResponse.next();

    return RedirectToLocale({ handle: params?.handle });
}
