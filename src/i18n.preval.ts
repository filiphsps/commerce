import { i18n } from '../next-i18next.config.cjs';
import preval from 'next-plugin-preval';

async function getLocalesData() {
    const locale = i18n.defaultLocale;
    //const locales = await LocalesApi({ locale });

    return {
        //locales
    };
}

export default preval(getLocalesData());
