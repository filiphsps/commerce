import { verifyAccess } from '@vercel/flags';
import { NextResponse } from 'next/server';

import type { ApiData } from '@vercel/flags';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const access = await verifyAccess(request.headers.get('Authorization'));
    if (!access) return NextResponse.json(null, { status: 401 });

    return NextResponse.json<ApiData>({
        definitions: {
            'search-filter': {
                description: 'Controls if the search filter is visible',
                options: [
                    { value: false, label: 'Off' },
                    { value: true, label: 'On' }
                ]
            }
        }
    });
}
