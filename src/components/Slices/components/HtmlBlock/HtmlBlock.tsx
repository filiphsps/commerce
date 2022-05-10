import React, { FunctionComponent, memo } from 'react';

interface HtmlBlockProps {
    data?: any;
}
const HtmlBlock: FunctionComponent<HtmlBlockProps> = (props) => {
    return (
        <div
            className="Slice Slice-HtmlBlock"
            dangerouslySetInnerHTML={{ __html: props?.data?.body }}
        />
    );
};

export default memo(HtmlBlock);
