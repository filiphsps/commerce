import React, { FunctionComponent } from 'react';

interface PageContentProps {
    style?: any;

    className?: string;
    children: any;
}
const PageContent: FunctionComponent<PageContentProps> = (props) => {
    return (
        <div className={`PageContent ${props.className}`} style={props.style}>
            {props.children}
        </div>
    );
};

export default PageContent;
