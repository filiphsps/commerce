import { Config } from './util/Config';
import { FooterApi } from './api/footer';
import type { FooterModel } from './models/FooterModel';
import { HeaderApi } from './api/header';
import type { HeaderModel } from './models/HeaderModel';
import { NavigationApi } from './api/navigation';
import type { NavigationItem } from './api/navigation';
import { StoreApi } from './api/store';
import type { StoreModel } from './models/StoreModel';
import preval from '@sweetsideofsweden/next-plugin-preval';

async function getStoreData() {
    const locale = Config.i18n.default;

    let store: StoreModel | null = null,
        navigation: NavigationItem[] | null = null,
        header: HeaderModel | null = null,
        footer: FooterModel | null = null;

    try {
        store = await StoreApi({ locale });
        navigation = await NavigationApi({ locale });
        header = await HeaderApi({ locale });
        footer = await FooterApi({ locale });
    } catch (error) {
        console.warn(error);
    }

    return {
        store,
        navigation,
        header,
        footer
    };
}

export default preval(getStoreData());
