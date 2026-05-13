import '../globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '404: Page Not Found',
    icons: {
        icon: ['/favicon.png'],
        shortcut: ['/favicon.png'],
        apple: ['/favicon.png'],
    },
    robots: {
        index: false,
        follow: false,
    },
    referrer: 'origin',
};

export default function NotFound() {
    return (
        <main className="p-3">
            <header className="pb-6">
                <div className="font-extrabold text-7xl leading-none">404.</div>
                <h1 className="font-normal text-4xl text-foreground/65 lowercase leading-tight">Page not found.</h1>
            </header>

            <p className="block max-w-full md:w-[42rem] md:text-base">The requested resource could not be found.</p>
        </main>
    );
}
