import TitleToHandle from './TitleToHandle';

const example_titles = [
    ['Siberia', 'siberia'],
    ['G.3', 'g-3'],
    ['1.2kg Pakete', '1-2kg-pakete'],
    ['On!', 'on'],
    ["A'hoy", 'ahoy'],
    ['Rapé', 'rape']
];

describe('Util', () => {
    describe('TitleToHandle', () => {
        it('Should convert vendors to handles', () => {
            for (let i = 0; i < example_titles.length; i++) {
                const item = example_titles[i];

                let res = TitleToHandle(item[0]);
                expect(res == item[1]).toBeTruthy();
            }
        });
    });
});
