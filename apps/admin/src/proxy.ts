import { NextResponse } from 'next/server';

export const config = {
    matcher: ['/((?!_next|_static|_vercel|instrumentation|assets|favicon.ico|[\\w-]+\\.\\w+).*)'],
    missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
};

export default function proxy() {
    return NextResponse.next();
}
