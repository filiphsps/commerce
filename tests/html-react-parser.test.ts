import HTMLParse from 'html-react-parser';

describe('Utils', () => {
    describe('html-react-parser', () => {
        it('should convert without throwing an error', () => {
            let html = HTMLParse('<div>Hello</div>');
            expect(html);
        });
    });
});
