import { Config } from '@/utils/Config';

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/'
            },
            {
                userAgent: '*',
                disallow: ['/checkout/', '/account/', '/admin/', '/cdn-cgi/']
            }
        ],
        sitemap: `https://${Config.domain}/sitemap.xml`,
        host: `https://${Config.domain}`
    };
}
