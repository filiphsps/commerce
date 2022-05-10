import React, { FunctionComponent, memo } from 'react';

import LanguageString from '../LanguageString';

interface ProductBadgesProps {
    data?: any;
}
const ProductBadges: FunctionComponent<ProductBadgesProps> = (props) => {
    const { data } = props;

    if (!data?.type) return null;

    return (
        <div className="ProductBadges">
            <div className="ProductBadges-Badge">
                <LanguageString id={data?.type} />
            </div>
        </div>
    );
};

export default memo(ProductBadges);
