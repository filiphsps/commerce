import { FunctionComponent, useEffect } from 'react';
import { getCookie, hasCookie, setCookie } from 'cookies-next';

import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

interface ShopifyAnalyticsProps {}
const ShopifyAnalytics: FunctionComponent<ShopifyAnalyticsProps> = () => {
    const router = useRouter();
    useEffect(() => {
        if (!hasCookie('session'))
            setCookie('session', uuidv4(), { maxAge: 60 * 60 * 24 });
        if (!hasCookie('user')) setCookie('user', uuidv4());

        const session = getCookie('session');
        const user = getCookie('user');

        fetch('https://monorail-edge.shopifysvc.com/unstable/produce_batch', {
            method: 'post',
            headers: {
                'content-type': 'text/plain'
            },
            body: JSON.stringify({
                events: [
                    {
                        schema_id: 'trekkie_storefront_page_view/1.4',
                        payload: {
                            appClientId: '6167201',
                            hydrogenSubchannelId: '',
                            url: location.href,
                            path: location.pathname,
                            search: location.search,
                            referrer: document.referrer,
                            title: document.title,
                            uniqToken: user,
                            visitToken: session,
                            microSessionId: location.pathname, // FIXME
                            microSessionCount: 1,

                            shopId: 60485566618
                        },
                        metadata: {
                            event_created_at_ms: Date.now()
                        }
                    }
                ],
                metadata: {
                    event_sent_at_ms: Date.now()
                }
            })
        });
    }, [router.pathname]);
    return null;
};

export default ShopifyAnalytics;
