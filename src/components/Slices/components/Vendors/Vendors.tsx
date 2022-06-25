import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import VendorsComponent from '../../../Vendors';

interface VendorsProps {
    data?: any;
}
const Vendors: FunctionComponent<VendorsProps> = (props) => {
    const theme = props?.data?.theme || props?.data?.primary?.theme;

    return (
        <div className="Slice Slice-Vendors">
            <ContentBlock dark={theme === 'dark'}>
                <PageContent>
                    <VendorsComponent />
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(Vendors);
