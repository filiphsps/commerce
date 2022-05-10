import React, { FunctionComponent, memo } from 'react';

interface SocialShareProps {}
const SocialShare: FunctionComponent<SocialShareProps> = (props) => {
    return (
        <div className="SocialShare">
            <a
                rel="noopener noreferrer"
                target="_blank"
                title="facebook"
                href={`https://www.facebook.com/sharer.php?u=${
                    process.browser && window.location.href
                }`}
            >
                <img
                    alt="facebook"
                    src="/assets/icons/social/facebook-outline.svg"
                />
            </a>
            <a
                rel="noopener noreferrer"
                target="_blank"
                title="twitter"
                href={`https://www.twitter.com/share?url=${
                    process.browser && window.location.href
                }`}
            >
                <img
                    alt="twitter"
                    src="/assets/icons/social/twitter-outline.svg"
                />
            </a>
        </div>
    );
};

export default memo(SocialShare);
