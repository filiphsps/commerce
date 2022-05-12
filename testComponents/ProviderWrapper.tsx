import React, { memo } from 'react';

import { ModalProvider } from '@liholiho/react-modal-hook';
import { withStore } from 'react-context-hook';

const ProviderWrapper = (props) => {
    return <ModalProvider>{props.children}</ModalProvider>;
};

export default withStore(memo(ProviderWrapper), {
    currency: 'USD',
    cart: null,
    store: null
});
