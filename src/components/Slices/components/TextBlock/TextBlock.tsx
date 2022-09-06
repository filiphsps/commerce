import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import TextBlockComponent from '../../../TextBlock';

interface TextBlockProps {
    data?: {
        primary: {
            theme: 'light' | 'dark';
        };
        items: Array<{
            image: any;
            text: any;
        }>;
    };
}
const TextBlock: FunctionComponent<TextBlockProps> = ({ data }) => {
    return (
        <div className="Slice Slice-TextBlock">
            <ContentBlock dark={data?.primary?.theme === 'dark'}>
                <PageContent>
                    {data?.items?.map((item, index) => {
                        return (
                            <TextBlockComponent
                                key={index}
                                image={item?.image?.url ? item.image : null}
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
