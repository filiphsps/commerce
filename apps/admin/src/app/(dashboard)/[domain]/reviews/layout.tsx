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
            <section className="fixed inset-8 z-30 empty:hidden">{modal}</section>
            {children as any}
        </>
    );
}
