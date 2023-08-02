const path = require('path');

const locales = [
    ...(process.env.STORE_LOCALES ? [...process.env.STORE_LOCALES.split(',')] : ['en-US'])
];

const i18n = {
    locales: ['x-default', ...locales],
    defaultLocale: 'x-default',
    localeDetection: false
};

/** @type {import('next-i18next').UserConfig} */
module.exports = {
    i18n,
    fallbackLng: (code) => {
        if (!code || !code.includes('-') || code === 'x-default') return 'en';

        // TODO: verify that the translation actually exists
        return code.split('-').at(0)?.toLowerCase() || 'en';
    },
    reloadOnPrerender: process.env.NODE_ENV === 'development',
    localePath: path.resolve('./public/locales'),
    serializeConfig: false
};
