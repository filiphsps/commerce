import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Nordcom Commerce',
        short_name: 'nordcom',
        description: 'Nordcom Commerce',
        display_override: ['standalone', 'fullscreen'],
        scope: `https://${(process.env.ADMIN_DOMAIN as string) || 'admin.shops.nordcom.io'}/`,
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#ED1E79',
        icons: [
            {
                src: '/favicon.png',
                sizes: '3000x3000',
                type: 'image/png'
            }
        ]
    };
}
