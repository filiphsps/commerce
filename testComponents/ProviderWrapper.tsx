import { memo } from 'react';

const ProviderWrapper = (props) => {
    return <>{props.children}</>;
};

export default memo(ProviderWrapper);
