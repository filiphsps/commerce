import { prismic } from './prismic';

export const FooterApi = async (locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await prismic().getSingle('footer', {
                lang: locale
            });

            resolve({
                address: res.data.address,
                show_language_selector: res.data.show_language_selector,
                show_currency_selector: res.data.show_currency_selector,
                blocks: res.data.body.map((item) => ({
                    title: item.primary.title,
                    items: item.items
                }))
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
