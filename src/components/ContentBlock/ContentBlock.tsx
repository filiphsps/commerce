import React, { FunctionComponent } from 'react';

interface ContentBlockProps {
    children: any;
    className?: string;
}
const ContentBlock: FunctionComponent<ContentBlockProps> = (props) => {
    return (
        <div className={`ContentBlock ${props.className}`}>
            {props.children}
        </div>
    );
};

export default ContentBlock;
