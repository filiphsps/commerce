import React, { FunctionComponent, memo } from 'react';

import CollectionBlockComponent from '../../../CollectionBlock';
import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';

interface CollectionBlockProps {
    data?: any;
    prefetch?: any;
}
const CollectionBlock: FunctionComponent<CollectionBlockProps> = (props) => {
    const handle = props?.data?.handle || props?.data?.primary?.handle;
    const limit = props?.data?.limit || props?.data?.primary?.limit;
    const layout = props?.data?.layout || props?.data?.primary?.layout;
    const hide_title =
        props?.data?.hideTitle || props?.data?.primary?.hide_title;

    return (
        <div className="Slice Slice-CollectionBlock">
            <ContentBlock>
                <PageContent>
                    <CollectionBlockComponent
                        handle={handle}
                        isHorizontal={layout === 'horizontal'}
                        limit={limit}
                        data={props?.prefetch?.collections[handle]}
                        hideTitle={hide_title}
                        plainTitle
                    />
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(CollectionBlock);
