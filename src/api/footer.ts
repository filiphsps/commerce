import { prismic } from './prismic';

export const FooterApi = async (locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const footer = await prismic().getSingle('footer', {
                lang: locale
            });

            console.log(footer);
            resolve(null);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
