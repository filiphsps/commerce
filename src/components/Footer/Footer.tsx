import React, { FunctionComponent } from 'react';

import Image from 'next/image';
import LanguageString from '../LanguageString';
import Link from '../Link';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

const Copyright = styled.div`
    text-transform: uppercase;
`;

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
                <div className="Footer-Wrapper">
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

                        <div className="Footer-Blocks-Block"></div>
                        <div className="Footer-Blocks-Block"></div>
                        <div className="Footer-Blocks-Block"></div>
                    </div>

                    <Copyright>
                        &copy; {new Date().getFullYear()}{' '}
                        <a href="https://spsgroup.se">SPS Group AB</a> - All
                        rights reserved
                    </Copyright>
                </div>
            </footer>
        </>
    );
};

export default Footer;
