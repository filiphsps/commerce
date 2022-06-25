import { prismic } from './prismic';

export const PageApi = async (handle: string, locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const page = await prismic().getByUID('page', handle, {
                lang: locale
            });

            return resolve(page?.data);
        } catch (err) {
            if (locale != 'en-US') {
                return resolve(await PageApi(handle, 'en-US'));
            }

            console.error(err);
            return reject(err);
        }
    });
};

export const PagesApi = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const pages = await prismic().getAllByType('page');

            return resolve(pages.map((page) => page.uid));
        } catch (err) {
            console.error(err);
            return reject(err);
        }
    });
};
