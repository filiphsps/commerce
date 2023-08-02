import * as nextI18nextConfig from '../../next-i18next.config.cjs';

import type { SSRConfig, UserConfig } from 'next-i18next';

import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export const getServerTranslations = async (
    locale: string,
    namespacesRequired?: string | string[],
    configOverride?: UserConfig,
    extraLocales?: string[] | false
): Promise<SSRConfig> => {
    const config = configOverride ?? nextI18nextConfig;
    return serverSideTranslations(locale, namespacesRequired, config, extraLocales);
};
