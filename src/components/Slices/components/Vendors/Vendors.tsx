import React, { FunctionComponent, memo } from 'react';

import ContentBlock from '../../../ContentBlock';
import PageContent from '../../../PageContent';
import VendorsComponent from '../../../Vendors';

interface VendorsProps {
    data?: any;
}
const Vendors: FunctionComponent<VendorsProps> = (props) => {
    return (
        <div className="Slice Slice-Vendors">
            <ContentBlock>
                <PageContent>
                    <VendorsComponent />
                </PageContent>
            </ContentBlock>
        </div>
    );
};

export default memo(Vendors);
