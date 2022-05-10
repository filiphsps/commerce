import React, { FunctionComponent, memo } from 'react';

import ReactMarkdown from 'react-markdown';

interface MarkdownBodyProps {
    body?: string;
}
const MarkdownBody: FunctionComponent<MarkdownBodyProps> = (props) => {
    return (
        <div className="MarkdownBody">
            <ReactMarkdown
                source={(props.body || '').replace(
                    new RegExp('\r\n', 'gi'),
                    '  '
                )}
                escapeHtml={false}
            />
        </div>
    );
};

export default memo(MarkdownBody);
