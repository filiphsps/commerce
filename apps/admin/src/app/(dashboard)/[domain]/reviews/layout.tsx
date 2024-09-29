import type { ReactNode } from 'react';

export default async function ReviewsLayout({
    children,
    create
}: {
    // TODO
    children: ReactNode;
    create: ReactNode;
}) {
    return (
        <>
            <div className="inset-8 bg-black md:fixed">{create}</div>
            {children}
        </>
    );
}
