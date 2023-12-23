import { ShopApi } from '@/api/shop';
import type { MetadataRoute } from 'next';
import { NextResponse, type NextRequest } from 'next/server';

/* c8 ignore start */
type Rules = Extract<MetadataRoute.Robots['rules'], Array<any>>;
type Rule = Rules[number];
const nextRobotsSchemaParser = (schema: MetadataRoute.Robots): string => {
    let output = '';

    const parseRule = ({ userAgent, crawlDelay, disallow, allow }: Rule): string => {
        let output = '';

        output += `# ${userAgent || 'unknown'}\n`;
        if (userAgent) {
            output += `User-agent: ${userAgent}\n`;
        }
        if (crawlDelay) {
            output += `\nCrawl-delay: ${crawlDelay}\n`;
        }

        if (disallow) {
            if (Array.isArray(disallow)) {
                output += `${disallow.map((path) => `Disallow: ${path}`).join('\n')}\n`;
            } else {
                output += `Disallow: ${disallow}\n`;
            }
        }
        if (allow) {
            if (Array.isArray(allow)) {
                output += `${allow.map((path) => `Allow: ${path}`).join('\n')}\n`;
            } else {
                output += `Allow: ${allow}\n`;
            }
        }

        return output + '\n';
    };

    output += parseRule({
        userAgent: '*',
        allow: '/'
    });

    if (schema.host) {
        output += `# Host\nHost: ${schema.host}\n\n`;
    }

    if (schema.sitemap) {
        if (Array.isArray(schema.sitemap)) {
            output += `# Sitemap(s)\n${schema.sitemap.map((sitemap) => `Sitemap: ${sitemap}`).join('\n')}\n\n`;
        } else {
            output += `# Sitemap\nSitemap: ${schema.sitemap}\n\n`;
        }
    }

    if (Array.isArray(schema.rules)) {
        const rules = schema.rules as Rules;
        output += `${rules.map((rule) => parseRule(rule)).join('\n')}\n`;
    } else if (typeof schema.rules === 'object') {
        const rule = schema.rules as Rule;
        output += parseRule(rule);
    }

    return output.trim();
};

export type RobotsParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: RobotsParams }): Promise<any> {
    const shop = await ShopApi(domain);

    return new NextResponse(
        nextRobotsSchemaParser({
            host: `https://${shop.domains.primary}`,
            rules: [
                {
                    userAgent: '*',
                    disallow: ['/storefront/', '/slice-machine/', '/cdn-cgi/']
                }
            ],
            sitemap: [`https://${shop.domains.primary}/sitemap.xml`]
        }),
        {}
    );
}
/* c8 ignore stop */
