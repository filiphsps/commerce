import React, { FunctionComponent, memo } from 'react';

import PageContent from '../../../PageContent';
import VendorsComponent from '../../../Vendors';

interface VendorsProps {}
const Vendors: FunctionComponent<VendorsProps> = () => {
    return (
        <div className="Slice Slice-Vendors">
            <PageContent>
                <VendorsComponent />
            </PageContent>
        </div>
    );
};

export default memo(Vendors);
