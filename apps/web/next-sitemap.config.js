var url = `https://${process.env.DOMAIN || 'www.sweetsideofsweden.com'}`;
var locales = [
    'x-default',
    ...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])
];

/** @type {import('next-sitemap').IConfig} */
const config = {
    siteUrl: `${url}`,
    alternateRefs: locales.map((locale) => ({
        href: (locale !== 'x-default' && `${url}/${locale}`) || url,
        hreflang: locale
    })),
    outDir: './public/www.sweetsideofsweden.com',
    generateRobotsTxt: true,
    generateIndexSitemap: true,
    robotsTxtOptions: {
        additionalSitemaps: [`https://${process.env.DOMAIN}/dynamic-sitemap.xml`],
        policies: [
            {
                userAgent: '*',
                ...(((url.includes('preview.') || url.includes('staging.')) && {
                    disallow: '/'
                }) || { allow: '/' })
            },
            {
                userAgent: '*',
                disallow: ['/x-default/', '/slice-machine/', '/admin/', '/cdn-cgi/']
            }
        ]
    },
    exclude: ['/admin/', '/x-default*', '*/products/*', '*/collections/*', '*.xml'],

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
