import { prismic } from './prismic';

export const StoreApi = async (locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const store = await prismic().getSingle('store', {
                lang: locale
            });

            resolve(store?.data);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
