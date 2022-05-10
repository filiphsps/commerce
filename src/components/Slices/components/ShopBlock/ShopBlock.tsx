import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import ShopBlockComponent from '../../../ShopBlock';

interface ShopBlockProps {
    store?: any;
    data?: any;
    prefetch?: any;
    country?: string;
}
const ShopBlock: FunctionComponent<ShopBlockProps> = (props) => {
    return (
        <div className="Slice Slice-ShopBlock">
            <ContentBlock dark={props?.data?.theme === 'dark'}>
                <PageContent>
                    <ShopBlockComponent
                        store={props?.store}
                        data={props?.prefetch?.shop}
                    />
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(ShopBlock);
