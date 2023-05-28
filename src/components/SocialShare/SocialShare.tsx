import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Image from 'next/legacy/image';

interface SocialShareProps {}
const SocialShare: FunctionComponent<SocialShareProps> = () => {
    const [href, setHref] = useState('');
    useEffect(() => {
        setHref(window.location.href);
    }, [process.browser]);

    const TempImage = Image as any;

    return (
        <div className="SocialShare">
            <a
                rel="noopener noreferrer"
                target="_blank"
                title="facebook"
                href={`https://www.facebook.com/sharer.php?u=${href}`}
            >
                <TempImage
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
                <TempImage
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
