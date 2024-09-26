import { findShopByDomainOverHttp } from '@/api/shop';
import { type NextRequest, NextResponse } from 'next/server';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
export const revalidate = false;

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

export type RobotsParams = Promise<{
    domain: string;
}>;
export async function GET({}: NextRequest, { params }: { params: RobotsParams }): Promise<any> {
    const { domain } = await params;
    const shop = await findShopByDomainOverHttp(domain);

    return new NextResponse(
        nextRobotsSchemaParser({
            host: `https://${shop.domain}`,
            rules: [
                {
                    userAgent: '*',
                    disallow: [
                        '/_next/static/chunks/',
                        '/_next/static/css/',
                        '/admin/',
                        '/assets/',
                        '/cdn-cgi/',
                        '/slice-machine/',
                        '/storefront/',
                        `/${shop.domain}/`
                    ]
                }
            ],
            sitemap: [`https://${shop.domain}/sitemap.xml`]
        }),
        {}
    );
}
