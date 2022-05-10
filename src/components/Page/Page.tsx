import React, { FunctionComponent } from 'react';

interface PageProps {
    className?: string;
}
const Page: FunctionComponent<PageProps> = (props) => {
    return (
        <main className={`Page ${props.className || ''}`}>
            {props.children}
        </main>
    );
};

export default Page;
