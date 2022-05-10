import { prismic } from './prismic';

export const NavigationApi = async (locale = 'en-US') => {
    return new Promise(async (resolve, reject) => {
        try {
            const navigation = await prismic().getSingle('navigation', {
                lang: locale
            });

            resolve(
                (navigation?.data?.body as any)?.map((item) => item.primary)
            );
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
