import { Config } from './util/Config';
import { FooterApi } from './api/footer';
import { HeaderApi } from './api/header';
import { NavigationApi } from './api/navigation';
import { StoreApi } from './api/store';
import preval from 'next-plugin-preval';

async function getStoreData() {
    const locale = Config.i18n.locales[0];

    const store = await StoreApi({ locale });
    const navigation = await NavigationApi(locale);
    const header = await HeaderApi(locale);
    const footer = await FooterApi(locale);

    return {
        store,
        navigation,
        header,
        footer
    };
}

export default preval(getStoreData());
