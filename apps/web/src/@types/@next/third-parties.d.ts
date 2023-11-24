// https://github.com/vercel/next.js/issues/58697
declare module '@next/third-parties/google' {
    declare global {
        interface Window {
            locale?: string;
            dataLayer?: Object[];
            [key: string]: any;
        }
    }

    export type GTMParams = {
        gtmId: string;
        dataLayer?: string[];
        dataLayerName?: string;
        auth?: string;
        preview?: string;
    };

    declare const sendGTMEvent: (event: Object) => void;
    declare const GoogleTagManager: (props: GTMParams) => any;
}
