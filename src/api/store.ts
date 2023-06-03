import * as Sentry from '@sentry/nextjs';

import { Config } from '../util/Config';
import { StoreModel } from '../models/StoreModel';
import { prismic } from './prismic';

export const StoreApi = async (locale = Config.i18n.locales[0]): Promise<StoreModel> => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = (
                await prismic().getSingle('store', {
                    lang: locale === '__default' ? Config.i18n.locales[0] : locale
                })
            ).data;

            const currencies = res.currencies.map((item) => item.currency);

            // FIXME: add custom_header_tags, custom_body_tags; or do this through gtm and instead just provide a gtm_id.
            return resolve({
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
                languages: Config.i18n.locales,
                social: res.social,
                block: {
                    border_radius: res.border_radius || '0.5rem'
                }
            });
        } catch (error) {
            if (error.message.includes('No documents') && locale !== Config.i18n.locales[0]) {
                return resolve(await StoreApi()); // Try again with default locale
            }

            Sentry.captureException(error);
            console.error(error);
            return reject(error);
        }
    });
};
