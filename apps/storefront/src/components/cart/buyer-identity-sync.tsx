'use client';

import { SessionContext } from 'next-auth/react';
import { useContext } from 'react';

import { useSyncBuyerIdentity } from './use-sync-buyer-identity';

const InnerSync = () => {
    useSyncBuyerIdentity();
    return null;
};

const BuyerIdentitySync = () => {
    const sessionCtx = useContext(SessionContext);
    if (sessionCtx === undefined) return null;
    return <InnerSync />;
};
BuyerIdentitySync.displayName = 'Nordcom.Cart.BuyerIdentitySync';

export default BuyerIdentitySync;
