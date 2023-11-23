import 'server-only';

import type { Shop } from '@/api/shop';
import type { LanguageCode, Locale, LocaleDictionary } from '@/utils/locale';

const stub = { cart: {}, common: {} };

export const dictionaries: Record<Lowercase<LanguageCode>, () => Promise<LocaleDictionary>> = {
    af: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ak: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    am: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ar: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    as: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    az: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    be: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    bg: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    bm: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    bn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    bo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    br: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    bs: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ca: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ce: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ckb: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    cs: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    cu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    cy: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    da: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    de: () => import('@/i18n/de.json').then((module) => module.default) as any,
    dz: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ee: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    el: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    en: () => import('@/i18n/en.json').then((module) => module.default) as any,
    eo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    es: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    et: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    eu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    fa: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ff: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    fi: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    fil: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    fo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    fr: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    fy: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ga: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    gd: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    gl: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    gu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    gv: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ha: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    he: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    hi: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    hr: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    hu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    hy: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ia: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    id: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ig: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ii: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    is: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    it: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ja: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    jv: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ka: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ki: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    kk: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    kl: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    km: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    kn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ko: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ks: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ku: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    kw: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ky: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    la: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    lb: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    lg: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ln: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    lo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    lt: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    lu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    lv: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mg: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mi: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mk: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ml: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mr: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ms: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    mt: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    my: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    nb: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    nd: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ne: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    nl: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    nn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    no: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    om: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    or: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    os: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    pa: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    pl: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ps: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    pt_br: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    pt_pt: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    pt: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    qu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    rm: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    rn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ro: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ru: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    rw: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sa: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sc: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sd: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    se: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sg: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sh: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    si: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sk: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sl: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    so: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sq: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sr: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    su: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    sv: () => import('@/i18n/sv.json').then((module) => module.default) as any,
    sw: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ta: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    te: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    tg: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    th: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ti: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    tk: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    to: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    tr: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    tt: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ug: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    uk: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    ur: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    uz: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    vi: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    vo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    wo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    xh: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    yi: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    yo: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    zh_cn: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    zh_tw: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    zh: () => new Promise((resolve) => resolve(stub)) as any /* TODO */,
    zu: () => new Promise((resolve) => resolve(stub)) as any /* TODO */
};

export type DictionaryLanguageCode = keyof typeof dictionaries;

/**
 * Get dictionary for locale.
 * @todo Handle templates.
 *
 * @param {Locale} locale - Locale to get dictionary for.
 * @returns {Promise<LocaleDictionary>} Promise with dictionary.
 */
export const getDictionary = async (props: { shop: Shop; locale: Locale } | Locale): Promise<LocaleDictionary> => {
    let locale: Locale, shop: Shop | undefined;

    if (Object.hasOwn(props, 'shop')) {
        const temp = props as { shop: Shop; locale: Locale };
        locale = temp.locale;
        // eslint-disable-next-line unused-imports/no-unused-vars
        shop = temp.shop;
    } else {
        locale = props as Locale;
    }

    // TODO: Fetch tenant-specific dictionary if it exists and shop is defined.
    return dictionaries[locale?.language?.toLowerCase() as DictionaryLanguageCode]?.() ?? {};
};
