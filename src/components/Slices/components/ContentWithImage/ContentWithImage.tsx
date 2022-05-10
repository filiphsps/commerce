import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import Slices from '../..';

interface ContentWithImageProps {
    data?: any;
    store?: any;
    prefetch?: any;
    country?: string;
}
const ContentWithImage: FunctionComponent<ContentWithImageProps> = (props) => {
    const { data, store, prefetch } = props;

    return (
        <div className="Slice Slice-ContentWithImage">
            <ContentBlock dark={data?.theme === 'dark'}>
                <PageContent>
                    <div className="ContentWithImage">
                        <img
                            className="ContentWithImage-Image"
                            src={data?.src}
                        />
                        <div className="ContentWithImage-Content">
                            <Slices
                                store={store}
                                data={data?.slices}
                                prefetch={prefetch}
                            />
                        </div>
                    </div>
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(ContentWithImage);
