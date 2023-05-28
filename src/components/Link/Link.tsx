import React, { FunctionComponent } from 'react';

import NextLink from 'next/link';
import { useRouter } from 'next/router';

interface LinkProps {
    as?: string;
    to?: string;
    locale?: any;
    style?: any;
    className?: string;
    children?: any;

    itemType?: any;
    itemProp?: any;
}
const Link: FunctionComponent<LinkProps> = (props) => {
    const router = useRouter();

    return (
        <NextLink
            {...props}
            href={(props.as || props.to) as any}
            as={props.as ? props.to : undefined}
            locale={props.locale ? props.locale : router?.locale}
            className={`Link ${props.className}`}
            style={props.style}
        >
            {props.children}
        </NextLink>
    );
};

Link.defaultProps = {
    to: '',
    className: ''
};

export default Link;
