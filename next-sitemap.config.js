var url = `https://${process.env.DOMAIN || 'www.sweetsideofsweden.com'}`;
var locales = [
    '__default',
    ...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])
];

/** @type {import('next-sitemap').IConfig} */
const config = {
    siteUrl: `${url}`,
    alternateRefs: locales
        .filter((locale) => locale !== '__default')
        .map((locale) => ({
            href: `${url}/${locale}`,
            hreflang: locale
        })),

    generateRobotsTxt: true,
    generateIndexSitemap: true,
    robotsTxtOptions: {
        // additionalSitemaps: [`https://${process.env.DOMAIN}/dynamic-sitemap.xml`],
        policies: [
            {
                userAgent: '*',
                ...(((url.includes('preview.') || url.includes('staging.')) && {
                    disallow: '/'
                }) || { allow: '/' })
            },
            {
                userAgent: '*',
                disallow: ['/checkout/', '/account/', '/admin/']
            }
        ]
    },
    exclude: [
        '/admin/',
        '/__default*',
        //        '*/products/*',
        //        '*/collections/*',
        '*.xml'
    ],

    transform: async (config, path) => {
        if (!path.includes(locales[1])) return null;

        let cleanedPath = path;
        locales.forEach((locale) => (cleanedPath = cleanedPath.replace(`/${locale}`, '')));

        return {
            loc: cleanedPath,
            changefreq: config.changefreq,
            priority: config.priority,
            lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
            alternateRefs: config.alternateRefs
        };
    }
};

export default config;
