import React, { FunctionComponent, memo } from 'react';

import ContentBlockComponent from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import Slices from '../..';

interface ContentBlockProps {
    data?: any;
    store?: any;
    prefetch?: any;
    country?: string;
}
const ContentBlock: FunctionComponent<ContentBlockProps> = (props) => {
    const { data, store, prefetch } = props;

    return (
        <div className="Slice Slice-ContentBlock">
            <ContentBlockComponent>
                <PageContent>
                    <Slices
                        store={store}
                        data={data?.slices || data?.body}
                        prefetch={prefetch}
                    />
                </PageContent>
            </ContentBlockComponent>
        </div>
    );
};

export default memo(ContentBlock);
