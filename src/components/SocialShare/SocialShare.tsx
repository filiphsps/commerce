import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Image from 'next/image';

interface SocialShareProps {}
const SocialShare: FunctionComponent<SocialShareProps> = (props) => {
    const [href, setHref] = useState('');
    useEffect(() => {
        setHref(window.location.href);
    }, [process.browser]);

    return (
        <div className="SocialShare">
            <a
                rel="noopener noreferrer"
                target="_blank"
                title="facebook"
                href={`https://www.facebook.com/sharer.php?u=${href}`}
            >
                <Image
                    alt="facebook"
                    src="/assets/icons/social/facebook-outline.svg"
                    width="25px"
                    height="25px"
                />
            </a>
            <a
                rel="noopener noreferrer"
                target="_blank"
                title="twitter"
                href={`https://www.twitter.com/share?url=${href}`}
            >
                <Image
                    alt="twitter"
                    src="/assets/icons/social/twitter-outline.svg"
                    width="25px"
                    height="25px"
                />
            </a>
        </div>
    );
};

export default memo(SocialShare);
