import { verifyAccess } from '@vercel/flags';
import { NextResponse } from 'next/server';

import type { ApiData } from '@vercel/flags';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const access = await verifyAccess(request.headers.get('Authorization'));
    if (!access) {
        return NextResponse.json(null, { status: 401 });
    }

    return NextResponse.json<ApiData>({
        definitions: {
            'search-filter': {
                description: 'Controls if the search filter is visible',
                options: [
                    { value: false, label: 'Hidden' },
                    { value: true, label: 'Visible' }
                ]
            },
            'product-page-info-lines': {
                description: 'Controls if the info lines are visible on the product page',
                options: [
                    { value: false, label: 'Hidden' },
                    { value: true, label: 'Visible' }
                ]
            },
            'header-search-bar': {
                description: 'Controls if header search bar experiment is enabled',
                options: [
                    { value: false, label: 'Off' },
                    { value: true, label: 'On' }
                ]
            },
            'products-page': {
                description: 'Controls if the products page (`/products/`) is enabled',
                options: [
                    { value: false, label: 'Disabled' },
                    { value: true, label: 'Enabled' }
                ]
            },
            'accounts-functionality': {
                description: 'Controls if the accounts functionality is enabled',
                options: [
                    { value: false, label: 'Disabled' },
                    { value: true, label: 'Enabled' }
                ]
            }
        }
    });
}
/* c8 ignore stop */
