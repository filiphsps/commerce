import React, { memo } from 'react';

import Alert from '../src/components/Alert';
import { Provider as AlertProvider } from 'react-alert';
import { ModalProvider } from '@liholiho/react-modal-hook';
import { withStore } from 'react-context-hook';

const ProviderWrapper = (props) => {
    return (
        <AlertProvider template={Alert}>
            <ModalProvider>{props.children}</ModalProvider>
        </AlertProvider>
    );
};

export default withStore(memo(ProviderWrapper), {
    currency: 'USD',
    cart: null,
    store: null
});
