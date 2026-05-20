import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ApiReference } from './api-reference';

const FIXTURE_ROOT = path.resolve(__dirname, '../../tests/fixtures/typedoc');

describe('<ApiReference />', () => {
    it('renders symbol groups from the matching JSON', async () => {
        const element = await ApiReference({ subpath: 'sample', _rootDir: FIXTURE_ROOT });
        const html = renderToStaticMarkup(element);
        expect(html).toContain('getThing');
        expect(html).toContain('Functions');
    });

    it('renders an error callout in dev when subpath is unknown', async () => {
        const element = await ApiReference({ subpath: 'missing', _rootDir: FIXTURE_ROOT });
        const html = renderToStaticMarkup(element);
        expect(html.toLowerCase()).toContain('unknown subpath');
    });
});
