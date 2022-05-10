import React, { FunctionComponent, memo } from 'react';

import Markdown from 'react-markdown';

interface TextBlockProps {
    body?: string;
}
const TextBlock: FunctionComponent<TextBlockProps> = (props) => {
    return (
        <div className="TextBlock">
            <Markdown source={props?.body} escapeHtml={false} />
        </div>
    );
};

export default memo(TextBlock);
