import { prismic } from './prismic';

export const PageApi = async (handle: string, locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const page = await prismic().getByUID('page', handle, {
                lang: locale
            });

            resolve(page?.data);
        } catch (err) {
            console.error(err);

            if (locale != 'en-US') {
                return resolve(await PageApi(handle, 'en-US'));
            }

            reject(err);
        }
    });
};
