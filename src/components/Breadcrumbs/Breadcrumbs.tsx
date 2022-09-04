import React, { FunctionComponent } from 'react';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const SocialShare = dynamic(() => import('../SocialShare'), { ssr: false });

interface BreadcrumbsProps {
    pages?: Array<any>;
    store?: any;
    country?: string;
    hideSocial?: boolean;
}
const Breadcrumbs: FunctionComponent<BreadcrumbsProps> = (props) => {
    const { store, hideSocial } = props;

    return (
        <div className="Breadcrumbs">
            <ol
                itemScope
                itemType="https://schema.org/BreadcrumbList"
                className="Breadcrumbs-Content"
            >
                <li
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                    className="Breadcrumbs-Content-Item"
                >
                    <Link
                        className="Link"
                        itemType="https://schema.org/Thing"
                        itemProp="item"
                        href={'/'}
                    >
                        <a itemProp="name" className="Link">
                            {store?.name || store?.title}
                        </a>
                    </Link>
                    <meta itemProp="position" content="1" />
                </li>
                {props?.pages?.map((item: any, index: any) => {
                    // FIXME: Hotfix.
                    if (item.url.includes('undefined')) return null;

                    return (
                        <li
                            key={index}
                            itemProp="itemListElement"
                            itemScope
                            itemType="https://schema.org/ListItem"
                            className="Breadcrumbs-Content-Item"
                        >
                            <Link
                                itemType="https://schema.org/Thing"
                                itemProp="item"
                                href={item.url}
                            >
                                <a itemProp="name" className="Link">
                                    {item.title}
                                </a>
                            </Link>
                            <meta itemProp="position" content={index + 2} />
                        </li>
                    );
                })}
            </ol>
            {!hideSocial && <SocialShare />}
        </div>
    );
};

export default Breadcrumbs;
