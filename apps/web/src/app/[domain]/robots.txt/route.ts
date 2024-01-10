import { ShopApi } from '@nordcom/commerce-database';
import type { MetadataRoute } from 'next';
import { NextResponse, type NextRequest } from 'next/server';

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
    const shop = await ShopApi(domain, true);

    return new NextResponse(
        nextRobotsSchemaParser({
            host: `https://${shop.domain}`,
            rules: [
                {
                    userAgent: '*',
                    disallow: ['/storefront/', '/slice-machine/', '/cdn-cgi/']
                }
            ],
            sitemap: [`https://${shop.domain}/sitemap.xml`]
        }),
        {}
    );
}
