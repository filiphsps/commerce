import { prismic } from './prismic';

export const NavigationApi = async (
    locale = 'en-US'
): Promise<
    Array<{
        title: string;
        handle?: string;
        children: Array<{
            title: string;
            handle?: string;
        }>;
    }>
> => {
    return new Promise(async (resolve, reject) => {
        try {
            const navigation = await prismic().getSingle('navigation', {
                lang: locale
            });

            resolve(
                (navigation?.data?.body as any)?.map((item) => ({
                    title: item.primary.title,
                    handle: item.primary.handle,
                    children: item.items
                }))
            );
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
