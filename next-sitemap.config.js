var url = `${process.env.DOMAIN || 'https://www.sweetsideofsweden.com'}`;
var locales = [
    '__default',
    ...(process.env.STORE_LOCALES
        ? [...process.env.STORE_LOCALES.split(',')]
        : ['en-US'])
];

/** @type {import('next-sitemap').IConfig} */
const config = {
    siteUrl: `${url}`,
    alternateRefs: locales
        //.filter((i) => i !== '__default')
        .filter((locale) => locale !== '__default')
        .map((locale) => ({
            href: `${url}/${locale}`,
            hreflang: locale,
            hrefIsAbsolute: true
        })),

    generateRobotsTxt: true,
    generateIndexSitemap: true,
    robotsTxtOptions: {
        additionalSitemaps: [
            `https://${process.env.DOMAIN}/dynamic-sitemap.xml`
        ],
        policies: [
            {
                userAgent: '*',
                allow: '/'
            },
            {
                userAgent: '*',
                disallow: ['/checkout/', '/account/', '/admin']
            }
        ]
    },
    exclude: [
        '/admin/',
        '/__default*',
        '*/products/*',
        '*/collections/*',
        '*/collections/*',
        '*.xml'
    ],

    transform: async (config, path) => {
        // Remove the locale part of the path (e.g. /es/about -> /about)
        const extractLocaleIndependentPath = (path) => {
            const matches = config.alternateRefs.map((alt) =>
                `${config.siteUrl}${path}`
                    .replace(alt.href, '')
                    .replace(/\/$/, '')
            );
            return matches.sort((a, b) => a.length - b.length)[0];
        };

        const localeIndependentPath = extractLocaleIndependentPath(path);

        // Map the locale independent path onto the locale paths
        const alternateRefs = config.alternateRefs.map((alt) => {
            return {
                ...alt,
                href: `${alt.href}${localeIndependentPath}`,
                hrefIsAbsolute: true
            };
        });

        // FIXME: This creates duplicates
        let cleanedPath = path;
        locales.forEach(
            (locale) => (cleanedPath = cleanedPath.replace(`/${locale}`, ''))
        );

        return {
            loc: cleanedPath,
            changefreq: config.changefreq,
            priority: config.priority,
            lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
            alternateRefs
        };
    }
};

export default config;
