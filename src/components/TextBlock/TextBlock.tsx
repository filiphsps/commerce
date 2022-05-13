import React, { FunctionComponent, memo } from 'react';

interface TextBlockProps {
    body?: string;
}
const TextBlock: FunctionComponent<TextBlockProps> = (props) => {
    return (
        <div className="TextBlock">
            <div
                dangerouslySetInnerHTML={{
                    __html: props?.body
                }}
            />
        </div>
    );
};

export default memo(TextBlock);
