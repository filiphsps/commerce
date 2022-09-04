import { prismic } from './prismic';

export const HeaderApi = async (locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await prismic().getSingle('head', {
                lang: locale
            });

            resolve(res.data);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
