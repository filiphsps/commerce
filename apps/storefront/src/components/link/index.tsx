import { Suspense } from 'react';

import InternalLink from './link';

import type { LinkProps } from './link';

const Link = (props: LinkProps) => {
    return (
        <Suspense key={props.href.toString()} fallback={<span>{props.children}</span>}>
            <InternalLink {...props} />
        </Suspense>
    );
};

Link.displayName = 'Nordcom.Link';
export default Link;
