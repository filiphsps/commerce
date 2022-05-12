import React, { FunctionComponent } from 'react';

interface ContentBlockProps {
    dark?: boolean;
    children: any;
}
const ContentBlock: FunctionComponent<ContentBlockProps> = (props) => {
    return (
        <div className={`ContentBlock ${props.dark && 'ContentBlock-Dark'}`}>
            {props.children}
        </div>
    );
};

export default ContentBlock;
