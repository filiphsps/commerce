import React, { FunctionComponent } from 'react';

import Image from 'next/image';
import LanguageString from '../LanguageString';
import Link from '../Link';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

interface FooterProps {
    store?: any;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const [currency, setCurrency] = useStore<any>('currency');
    const router = useRouter();

    return (
        <>
            <footer className="Footer">
                <div className="Footer-Blocks">
                    <div className="Footer-Blocks-Block Footer-Blocks-Block-About">
                        <div
                            className="Footer-Blocks-Block-About-Logo"
                            style={{
                                backgroundImage: `url('${store?.logo?.src}')`
                            }}
                        />

                        <address>
                            SPS Group AB
                            <br />
                            Baldersgatan 3
                            <br />
                            411 02 Göteborg
                            <br />
                            Sweden
                        </address>
                    </div>

                    {/*<div className="Footer-Blocks-Block"></div>
                    <div className="Footer-Blocks-Block"></div>

                    <div className="Footer-Blocks-Block Footer-Blocks-Block-Settings">
                        <h2>
                            <LanguageString id="language" />
                        </h2>
                        {(process.env.NEXT_PUBLIC_LANGUAGES || 'en-US')
                            .split(',')
                            .map((lang) => {
                                return (
                                    <Link
                                        key={lang}
                                        to={router.asPath}
                                        locale={lang}
                                    >
                                        <LanguageString
                                            id={lang}
                                            className={
                                                (lang == router?.locale &&
                                                    'bold') ||
                                                ''
                                            }
                                        />
                                    </Link>
                                );
                            })}
                    </div>*/}
                </div>
            </footer>
        </>
    );
};

export default Footer;
