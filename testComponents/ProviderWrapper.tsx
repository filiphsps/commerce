import React, { memo } from 'react';

import { withStore } from 'react-context-hook';

const ProviderWrapper = (props) => {
    return <>{props.children}</>;
};

export default withStore(memo(ProviderWrapper), {
    currency: 'USD',
    cart: null,
    store: null
});
