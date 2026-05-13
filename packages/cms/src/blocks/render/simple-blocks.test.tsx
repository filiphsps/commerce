// @vitest-environment happy-dom
/**
 * Coverage tests for the no-context block renderers — AlertBlock, BannerBlock,
 * HtmlBlock, MediaGridBlock, RichTextBlock. Each exercises the success path
 * plus the obvious edge cases (missing optional fields, empty arrays, link
 * vs no-link, collapsible variants).
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertBlock } from './AlertBlock';
import { BannerBlock } from './BannerBlock';
import { HtmlBlock } from './HtmlBlock';
import { MediaGridBlock } from './MediaGridBlock';
import { RichTextBlock } from './RichTextBlock';
import type { BlockRenderContext } from './types';

const ctx: BlockRenderContext = {
    shop: { id: 'shop-1', domain: 'example.com' },
    locale: { code: 'en-US' },
    loaders: {
        loadCollection: async () => null,
        loadVendors: async () => [],
        loadOverview: async () => [],
    },
};

describe('AlertBlock', () => {
    it('renders title + body with the severity in className and data-severity', () => {
        const { container, getByText } = render(
            <AlertBlock
                block={{
                    blockType: 'alert',
                    severity: 'warning',
                    title: 'Heads up',
                    body: 'Something is off',
                }}
            />,
        );
        expect(getByText('Heads up')).toBeTruthy();
        expect(getByText('Something is off')).toBeTruthy();
        const aside = container.querySelector('aside');
        expect(aside?.getAttribute('data-severity')).toBe('warning');
        expect(aside?.className).toContain('cms-alert--warning');
        expect(aside?.getAttribute('role')).toBe('alert');
    });

    it('omits the body paragraph when body is absent', () => {
        const { container } = render(
            <AlertBlock
                block={{ blockType: 'alert', severity: 'info', title: 'Ping' } as never}
            />,
        );
        expect(container.querySelector('p')).toBeNull();
    });
});

describe('BannerBlock', () => {
    it('renders heading + cta and reflects alignment in className', () => {
        const { container, getByText } = render(
            <BannerBlock
                context={ctx}
                block={{
                    blockType: 'banner',
                    heading: 'Hello',
                    alignment: 'center',
                    cta: { kind: 'external', url: '/x', label: 'Buy', openInNewTab: true },
                }}
            />,
        );
        expect(getByText('Hello')).toBeTruthy();
        const cta = getByText('Buy') as HTMLAnchorElement;
        expect(cta.getAttribute('href')).toBe('/x');
        expect(cta.getAttribute('target')).toBe('_blank');
        const section = container.querySelector('section');
        expect(section?.className).toContain('cms-banner--align-center');
    });

    it('resolves a kind=page CTA to a localised storefront URL', () => {
        // Before the fix the renderer only read `cta.url`, so a CTA built in the
        // CMS UI as "Internal page → About" had no href and silently
        // disappeared from the rendered banner.
        const { container } = render(
            <BannerBlock
                context={ctx}
                block={{
                    blockType: 'banner',
                    heading: 'Hi',
                    alignment: 'left',
                    cta: { kind: 'page', page: { slug: 'about' }, label: 'About us' },
                }}
            />,
        );
        const anchor = container.querySelector('a');
        expect(anchor?.getAttribute('href')).toBe('/en-US/about/');
        expect(anchor?.textContent).toBe('About us');
    });

    it('resolves a kind=product CTA via productMetadata.shopifyHandle', () => {
        const { container } = render(
            <BannerBlock
                context={ctx}
                block={{
                    blockType: 'banner',
                    heading: 'Hi',
                    alignment: 'left',
                    cta: { kind: 'product', product: { shopifyHandle: 'red-shoe' }, label: 'Shop' },
                }}
            />,
        );
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/en-US/products/red-shoe/');
    });

    it('does not render the CTA when the link is unfilled', () => {
        const { container } = render(
            <BannerBlock
                context={ctx}
                block={{
                    blockType: 'banner',
                    heading: 'Bare',
                    alignment: 'left',
                    cta: { kind: 'page', label: 'No-op' },
                }}
            />,
        );
        expect(container.querySelector('a')).toBeNull();
    });

    it('renders inline background style when background is an object with url', () => {
        const { container } = render(
            <BannerBlock
                context={ctx}
                block={{
                    blockType: 'banner',
                    heading: 'BG',
                    alignment: 'right',
                    background: { id: 'm1', url: '/bg.jpg' },
                }}
            />,
        );
        const section = container.querySelector('section');
        expect(section?.getAttribute('style')).toContain('/bg.jpg');
    });

    it('omits inline background style when background is a string (legacy)', () => {
        const { container } = render(
            <BannerBlock
                context={ctx}
                block={{
                    blockType: 'banner',
                    heading: 'BG',
                    alignment: 'right',
                    background: 'media-id-only' as never,
                }}
            />,
        );
        const section = container.querySelector('section');
        expect(section?.getAttribute('style')).toBeNull();
    });

    it('omits subheading paragraph when subheading absent', () => {
        const { container } = render(
            <BannerBlock
                context={ctx}
                block={{ blockType: 'banner', heading: 'Solo', alignment: 'left' } as never}
            />,
        );
        expect(container.querySelector('p')).toBeNull();
    });
});

describe('HtmlBlock', () => {
    it('dangerously injects raw html', () => {
        const { container } = render(
            <HtmlBlock block={{ blockType: 'html', html: '<b>bold</b>' }} />,
        );
        expect(container.querySelector('b')?.textContent).toBe('bold');
    });

    it('renders empty html as a div without crashing', () => {
        const { container } = render(<HtmlBlock block={{ blockType: 'html', html: '' }} />);
        const div = container.querySelector('div');
        expect(div).not.toBeNull();
        expect(div?.children.length).toBe(0);
    });
});

describe('MediaGridBlock', () => {
    it('renders an image with caption + wraps in a link when item.link.url present', () => {
        const { container } = render(
            <MediaGridBlock
                context={ctx}
                block={{
                    blockType: 'media-grid',
                    itemType: 'image',
                    columns: 2,
                    items: [
                        {
                            image: { id: 'm1', url: '/a.jpg', alt: 'first' },
                            caption: 'cap',
                            link: { kind: 'external', url: '/dest', openInNewTab: false },
                        },
                    ],
                }}
            />,
        );
        const img = container.querySelector('img');
        expect(img?.getAttribute('src')).toBe('/a.jpg');
        expect(img?.getAttribute('alt')).toBe('first');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/dest');
        expect(container.querySelector('figcaption')?.textContent).toBe('cap');
    });

    it('does not wrap in a link when link.url is absent', () => {
        const { container } = render(
            <MediaGridBlock
                context={ctx}
                block={{
                    blockType: 'media-grid',
                    itemType: 'image',
                    columns: 1,
                    items: [{ image: { id: 'm', url: '/a.jpg' } }],
                }}
            />,
        );
        expect(container.querySelector('a')).toBeNull();
        expect(container.querySelector('img')).not.toBeNull();
    });

    it('wraps in a link for kind=collection items via collectionRef.shopifyHandle', () => {
        const { container } = render(
            <MediaGridBlock
                context={ctx}
                block={{
                    blockType: 'media-grid',
                    itemType: 'image',
                    columns: 1,
                    items: [
                        {
                            image: { id: 'm', url: '/a.jpg' },
                            link: { kind: 'collection', collectionRef: { shopifyHandle: 'tops' } },
                        },
                    ],
                }}
            />,
        );
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/en-US/collections/tops/');
    });

    it('skips the <img> element when item has no usable image url (string id)', () => {
        const { container } = render(
            <MediaGridBlock
                context={ctx}
                block={{
                    blockType: 'media-grid',
                    itemType: 'image',
                    columns: 1,
                    items: [{ image: 'media-id-only' as never, caption: 'orphan' }],
                }}
            />,
        );
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('figcaption')?.textContent).toBe('orphan');
    });

    it('renders no figures for empty items', () => {
        const { container } = render(
            <MediaGridBlock
                context={ctx}
                block={{ blockType: 'media-grid', itemType: 'image', columns: 3, items: [] }}
            />,
        );
        expect(container.querySelectorAll('figure')).toHaveLength(0);
    });

    it('forwards columns as a CSS --cols custom property', () => {
        const { container } = render(
            <MediaGridBlock
                block={{ blockType: 'media-grid', itemType: 'icon', columns: 4, items: [] }}
            />,
        );
        const div = container.querySelector('.cms-media-grid') as HTMLElement;
        expect(div?.style.getPropertyValue('--cols')).toBe('4');
        expect(div?.getAttribute('data-item-type')).toBe('icon');
    });
});

describe('RichTextBlock', () => {
    const lexical = {
        root: {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [{ text: 'Hello world' }],
                },
                {
                    type: 'heading',
                    children: [{ text: 'A heading' }],
                },
                {
                    type: 'list',
                    children: [
                        { type: 'listitem', children: [{ text: 'one' }] },
                        { type: 'listitem', children: [{ text: 'two' }] },
                    ],
                },
            ],
        },
    };

    it('renders paragraphs, headings, and list items from a lexical tree', () => {
        const { container, getByText } = render(
            <RichTextBlock block={{ blockType: 'rich-text', body: lexical }} />,
        );
        expect(getByText('Hello world').tagName.toLowerCase()).toBe('p');
        expect(getByText('A heading').tagName.toLowerCase()).toBe('h2');
        expect(container.querySelectorAll('li')).toHaveLength(2);
    });

    it('wraps in a <details> element when collapsible (open by default)', () => {
        const { container } = render(
            <RichTextBlock
                block={{
                    blockType: 'rich-text',
                    body: lexical,
                    collapsible: true,
                    collapseLabel: 'Show more',
                }}
            />,
        );
        const details = container.querySelector('details');
        expect(details).not.toBeNull();
        expect(details?.hasAttribute('open')).toBe(true);
        expect(container.querySelector('summary')?.textContent).toBe('Show more');
    });

    it('closes the <details> by default when collapsedByDefault is true', () => {
        const { container } = render(
            <RichTextBlock
                block={{
                    blockType: 'rich-text',
                    body: lexical,
                    collapsible: true,
                    collapsedByDefault: true,
                }}
            />,
        );
        const details = container.querySelector('details');
        expect(details?.hasAttribute('open')).toBe(false);
    });

    it('uses "Read more" as the default summary label', () => {
        const { container } = render(
            <RichTextBlock
                block={{ blockType: 'rich-text', body: lexical, collapsible: true }}
            />,
        );
        expect(container.querySelector('summary')?.textContent).toBe('Read more');
    });

    it('renders empty when body has no root', () => {
        const { container } = render(
            <RichTextBlock block={{ blockType: 'rich-text', body: undefined as never }} />,
        );
        const rt = container.querySelector('.cms-rich-text');
        expect(rt?.textContent).toBe('');
    });
});
