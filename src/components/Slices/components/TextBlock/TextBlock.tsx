import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import TextBlockComponent from '../../../TextBlock';

interface TextBlockProps {
    data?: any;
}
const TextBlock: FunctionComponent<TextBlockProps> = (props) => {
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;

    return (
        <div className="Slice Slice-TextBlock">
            <ContentBlock dark={props?.data?.primary?.theme === 'dark'}>
                <PageContent>
                    {props?.data?.items?.map((item, index) => {
                        return (
                            <TextBlockComponent
                                key={index}
                                body={PrismicDOM.asHTML(item?.text)}
                            />
                        );
                    })}
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(TextBlock);
