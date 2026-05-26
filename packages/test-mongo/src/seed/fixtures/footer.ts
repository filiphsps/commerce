/**
 * Footer fixture for the seeded demo tenant. Mirrors a real brand footer:
 * four content sections (Shop, Help, Company, Account), every supported
 * social platform, a full legal-links row, and a copyright line.
 */

const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

export const footerData = {
    sections: [
        {
            title: 'Shop',
            links: [
                { link: externalLink('Womenswear', '/women/') },
                { link: externalLink('Menswear', '/men/') },
                { link: externalLink('Collections', '/collections/') },
                { link: externalLink('Archive sale', '/collections/archive/') },
                { link: externalLink('Gift cards', '/gift-cards/') },
            ],
        },
        {
            title: 'Help',
            links: [
                { link: externalLink('Contact', '/contact/') },
                { link: externalLink('Shipping & delivery', '/help/shipping/') },
                { link: externalLink('Returns', '/help/returns/') },
                { link: externalLink('Size guide', '/help/size-guide/') },
                { link: externalLink('FAQ', '/help/faq/') },
            ],
        },
        {
            title: 'Company',
            links: [
                { link: externalLink('About', '/about/') },
                { link: externalLink('Sustainability', '/sustainability/') },
                { link: externalLink('Press', '/press/') },
                { link: externalLink('Careers', '/careers/') },
                { link: externalLink('Stores', '/stores/') },
            ],
        },
        {
            title: 'Account',
            links: [
                { link: externalLink('Sign in', '/account/') },
                { link: externalLink('Order status', '/account/orders/') },
                { link: externalLink('Newsletter', '/newsletter/') },
                { link: externalLink('Wishlist', '/account/wishlist/') },
            ],
        },
    ],
    social: [
        { platform: 'instagram', url: 'https://instagram.com/nordcom-demo' },
        { platform: 'facebook', url: 'https://facebook.com/nordcom-demo' },
        { platform: 'tiktok', url: 'https://tiktok.com/@nordcom-demo' },
        { platform: 'youtube', url: 'https://youtube.com/@nordcom-demo' },
        { platform: 'linkedin', url: 'https://linkedin.com/company/nordcom-demo' },
    ],
    legal: [
        { link: externalLink('Privacy policy', '/legal/privacy/') },
        { link: externalLink('Terms of service', '/legal/terms/') },
        { link: externalLink('Cookies', '/legal/cookies/') },
        { link: externalLink('Accessibility', '/legal/accessibility/') },
        { link: externalLink('Imprint', '/legal/imprint/') },
    ],
    copyrightLine: '© 2026 Nordcom Demo Shop AB. All rights reserved.',
};
