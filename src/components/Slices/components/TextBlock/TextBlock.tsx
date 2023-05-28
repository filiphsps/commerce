import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import TextBlockComponent from '../../../TextBlock';

interface TextBlockProps {
    data?: {
        primary: {};
        items: Array<{
            image: any;
            text: any;
        }>;
    };
}
const TextBlock: FunctionComponent<TextBlockProps> = ({ data }) => {
    return (
        <section className="Slice Slice-TextBlock">
            <ContentBlock>
                <PageContent>
                    {data?.items?.map((item, index) => {
                        return (
                            <TextBlockComponent
                                key={index}
                                image={item?.image?.url ? item.image : null}
                                body={PrismicDOM.asHTML(item?.text) || ''}
                            />
                        );
                    })}
                </PageContent>
            </ContentBlock>
        </section>
    );
};

export default memo(TextBlock);
