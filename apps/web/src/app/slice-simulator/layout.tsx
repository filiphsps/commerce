import type { Metadata } from 'next';

export const metadata: Metadata = {
    robots: {
        follow: true,
        index: false
    }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head></head>
            <body>{children}</body>
        </html>
    );
}
