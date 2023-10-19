import { NextLocaleToLocale } from '@/utils/Locale';

export default function Page({ params }: { params: { locale: string; uid: string } }) {
    const { locale: localeData, uid } = params;
    const locale = NextLocaleToLocale(localeData);

    return <h1>Hello, Home page!</h1>;
}
