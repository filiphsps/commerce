import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent } from 'react';

import { FooterApi } from '../../api/footer';
import styled from 'styled-components';
import useSWR from 'swr';

const Copyright = styled.div`
    text-transform: uppercase;
`;

interface FooterProps {
    store?: any;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const { data } = useSWR([`footer`], () => FooterApi() as any, {});

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

                            <address
                                dangerouslySetInnerHTML={{
                                    __html: PrismicDOM.asText(
                                        data?.address,
                                        '<br />'
                                    )
                                }}
                            />
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
