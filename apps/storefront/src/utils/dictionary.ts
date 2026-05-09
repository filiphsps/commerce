import type { OnlineShop } from '@nordcom/commerce-db';

import type { LanguageCode, Locale, LocaleDictionary } from '@/utils/locale';

const stub = { cart: {}, common: {}, product: {} } as unknown as LocaleDictionary;

export const dictionaries: Record<Lowercase<LanguageCode>, () => Promise<LocaleDictionary>> = {
    af: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ak: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    am: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ar: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    as: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    az: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    be: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    bg: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    bm: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    bn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    bo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    br: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    bs: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ca: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ce: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ckb: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    cs: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    cu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    cy: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    da: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    de: () => import('@/i18n/de.json').then((module) => module.default as unknown as LocaleDictionary),
    dz: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ee: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    el: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    en: () => import('@/i18n/en.json').then((module) => module.default as unknown as LocaleDictionary),
    eo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    es: () => import('@/i18n/es.json').then((module) => module.default as unknown as LocaleDictionary),
    et: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    eu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    fa: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ff: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    fi: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    fil: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    fo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    fr: () => import('@/i18n/fr.json').then((module) => module.default as unknown as LocaleDictionary),
    fy: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ga: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    gd: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    gl: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    gu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    gv: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ha: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    he: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    hi: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    hr: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    hu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    hy: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ia: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    id: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ig: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ii: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    is: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    it: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ja: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    jv: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ka: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ki: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    kk: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    kl: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    km: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    kn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ko: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ks: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ku: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    kw: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ky: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    la: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    lb: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    lg: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ln: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    lo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    lt: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    lu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    lv: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mg: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mi: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mk: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ml: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mr: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ms: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    mt: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    my: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    nb: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    nd: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ne: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    nl: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    nn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    no: () => import('@/i18n/no.json').then((module) => module.default as unknown as LocaleDictionary),
    om: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    or: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    os: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    pa: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    pl: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ps: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    pt_br: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    pt_pt: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    pt: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    qu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    rm: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    rn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ro: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ru: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    rw: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sa: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sc: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sd: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    se: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sg: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sh: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    si: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sk: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sl: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    so: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sq: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sr: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    su: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    sv: () => import('@/i18n/sv.json').then((module) => module.default as unknown as LocaleDictionary),
    sw: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ta: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    te: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    tg: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    th: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ti: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    tk: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    to: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    tr: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    tt: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ug: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    uk: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    ur: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    uz: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    vi: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    vo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    wo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    xh: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    yi: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    yo: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    zh_cn: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    zh_tw: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    zh: () => new Promise((resolve) => resolve(stub)) /* TODO */,
    zu: () => new Promise((resolve) => resolve(stub)) /* TODO */,
};

export type DictionaryLanguageCode = keyof typeof dictionaries;

/**
 * Get dictionary for locale.
 * @todo Handle templates.
 *
 * @param {object} props - The data
 * @param {Locale} props.locale - Locale to get dictionary for.
 * @param {OnlineShop} props.shop - Shop to get dictionary for.
 * @returns {Promise<LocaleDictionary>} Promise with dictionary.
 */
export const getDictionary = async (
    props: { shop: OnlineShop; locale: Locale } | Locale,
): Promise<LocaleDictionary> => {
    let locale: Locale, _shop: OnlineShop | undefined;

    if (Object.hasOwn(props, 'shop')) {
        const temp = props as { shop: OnlineShop; locale: Locale };
        locale = temp.locale;
        // eslint-disable-next-line unused-imports/no-unused-vars
        _shop = temp.shop;
    } else {
        locale = props as Locale;
    }

    try {
        // TODO: Fetch tenant-specific dictionary if it exists and shop is defined.
        const lang = locale.language?.toLowerCase?.() as DictionaryLanguageCode | undefined;
        return typeof lang !== 'undefined' ? dictionaries[lang]() : ({} as unknown as LocaleDictionary);
    } catch {
        return {} as unknown as LocaleDictionary;
    }
};
