import { describe, expect, it } from 'vitest';

import { TitleToHandle } from '@/utils/title-to-handle';

describe('utils', () => {
    const example_titles = [
        ['Title', 'title'],
        ['Product Title', 'product-title'],
        ['title.product', 'title-product'],
        ['1.2kg Pack', '1-2kg-pack'],
        ['Hello World!', 'hello-world'],
        ["A'hoy", 'ahoy'],
        ['Francén', 'francen'],
        ['Another-Title', 'another-title']
    ];

    describe('TitleToHandle', () => {
        it('should convert titles to handles', () => {
            for (let i = 0; i < example_titles.length; i++) {
                const item = example_titles[i]!;

                let res = TitleToHandle(item[0]!);
                expect(res == item[1]).toBeTruthy();
                //expect(res).toMatchSnapshot();
            }
        });
    });
});
