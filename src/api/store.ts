import { StoreModel } from '../models/StoreModel';
import { prismic } from './prismic';

export const StoreApi = async (locale = 'en-US'): Promise<StoreModel> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = (
                await prismic().getSingle('store', {
                    lang: locale
                })
            ).data;

            const currencies = res.currencies.map((currency) => currency);

            // FIXME: add languages.
            // FIXME: add social.
            // FIXME: add custom_header_tags, custom_body_tags.
            resolve({
                name: res.store_name,
                logo: {
                    src: res.logo
                },
                favicon: {
                    src: res.favicon || res.logo
                },
                accent: {
                    primary: res.primary,
                    secondary: res.secondary
                },
                color: {
                    primary: res.primary_text_color,
                    secondary: res.primary_text_color
                },
                currencies: currencies,
                languages: [],
                social: [],
                block: {
                    border_radius: res.border_radius
                }
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};
