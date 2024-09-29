import type { ReactNode } from 'react';

export default async function ReviewsLayout({
    children,
    modal
}: Readonly<{
    children: ReactNode;
    modal: ReactNode;
}>) {
    return (
        <>
            <div className="fixed inset-8 z-10 empty:hidden">{modal}</div>
            {children}
        </>
    );
}
