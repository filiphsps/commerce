import * as PrismicDOM from '@prismicio/helpers';

import React, { FunctionComponent } from 'react';

import { Config } from '../../util/Config';
import { FooterApi } from '../../api/footer';
import Image from 'next/image';
//import Input from '../Input';
import Link from 'next/link';
//import { NewsletterApi } from '../../api/newsletter';
import PaymentIcons from '../../../public/assets/payments/icons.png';
import { StoreModel } from '../../models/StoreModel';
import styled from 'styled-components';
import useSWR from 'swr';

/*const EmailCapture = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--accent-primary);
`;
const EmailCaptureContent = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: 1fr 1fr auto;
    gap: 1rem;
    max-width: 100%;
    width: 1465px;
    height: 100%;
    min-height: 2rem;
    padding: 1rem 2rem;
`;
const EmailCaptureInput = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;

    input {
        height: 3.5rem;
        padding: 1rem;
        background: #fefefe;
        font-size: 1.25rem;
    }
`;
const EmailCaptureTitle = styled.div`
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
    font-size: 1.75rem;
`;
const EmailCaptureSubmit = styled.button`
    height: 3.5rem;
    padding: 1rem 1.5rem;
    border-radius: var(--block-border-radius);
    background: var(--color-text-primary);
    font-size: 1.25rem;
    transition: 150ms;

    &:hover {
        background: var(--accent-secondary-dark);
        color: var(--color-text-primary);
    }

    &:disabled {
        background: var(--color-text-primary);
        color: unset;
        opacity: 0.5;
    }
`;*/

const Logo = styled.div`
    position: relative;
    display: block;
    width: 100%;
    height: 5rem;
    margin: 0px 0px 1rem 0px;

    img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: center;

        @media (min-width: 950px) {
            object-position: 0px;
        }
    }
`;
const Address = styled.address`
    font-size: 1.25rem;
    line-height: 1.75rem;

    @media (max-width: 950px) {
        text-align: center;
    }
`;

const FooterContainer = styled.footer`
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    background: var(--accent-primary-dark);
    color: var(--color-text-primary);
    padding-top: 1em;

    a {
        transition: 150ms ease-in-out;
        &:hover {
            color: var(--accent-secondary-dark);
        }
    }
`;
const FooterWrapper = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
    grid-gap: 1.5rem;
    width: 1465px;
    max-width: 100%;
    padding: 1.5rem;
`;
const FooterBlocksContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;

    @media (max-width: 950px) {
        display: grid;
        grid-template-columns: 1fr;
    }
`;
const FooterBlock = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    width: 100%;
    height: 100%;
    text-transform: uppercase;
    padding-bottom: 1.5rem;
    font-size: 1.25rem;
    line-height: 1.75rem;

    @media (min-width: 950px) {
        padding-bottom: 0px;
        align-items: flex-start;
        justify-content: flex-start;
    }
`;

const BlockTitle = styled.div`
    font-size: 1.5rem;
    font-weight: 700;
    padding-bottom: 0.5rem;
    text-transform: uppercase;
`;

const LegalAndCopyright = styled.div`
    height: 4rem;

    @media (max-width: 950px) {
        margin: 1rem 0px;
    }
`;
const PaymentIconsContainer = styled.div`
    position: relative;
    width: 100%;
    height: 5rem;
    margin: 0px;

    @media (min-width: 950px) {
        margin: -1.5rem -1rem;
    }

    img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: center;

        @media (min-width: 950px) {
            object-position: 0px;
        }
    }
`;
const PaymentIconsWrapper = styled.div`
    display: flex;

    justify-content: center;
    align-items: center;
    overflow: clip;
    width: 100%;
    height: 2.25rem;

    @media (min-width: 950px) {
        display: block;
    }
`;
const FooterBottomSection = styled.section`
    display: grid;
    grid-template-columns: 1fr;
    border-top: 0.02rem solid var(--accent-primary);
    padding-top: 1rem;

    @media (min-width: 950px) {
        grid-template-columns: 1fr 1fr;
    }
`;
const FooterBottomSectionBlock = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 0.5em;

    &:nth-child(2) {
        align-items: flex-end;

        @media (max-width: 950px) {
            align-items: center;
        }
    }

    @media (max-width: 950px) {
        justify-content: flex-end;
        align-items: center;
    }
`;
const ImportantLinks = styled.div`
    display: grid;
    grid-template-columns: auto auto auto;
    gap: 1.25rem;
    height: 3rem;

    @media (min-width: 950px) {
        grid-template-columns: auto auto auto;
        gap: 1.25rem;
    }
`;
const Copyright = styled.div`
    display: block;
    height: 3rem;
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;

    @media (min-width: 950px) {
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        gap: 0.5rem;
        text-align: right;
    }
`;
const Policy = styled(Link)`
    padding: 1rem 0px;
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: uppercase;
`;
const Socials = styled(ImportantLinks)`
    display: flex;
    height: 3rem;
    justify-content: flex-end;
    align-items: flex-end;
`;
const Social = styled(Link)`
    position: relative;
    width: 2.5rem;
    height: 2.5rem;

    img {
        object-fit: contain;
    }
`;

interface FooterProps {
    store?: StoreModel;
    country?: string;
}
const Footer: FunctionComponent<FooterProps> = (props) => {
    const { store } = props;
    const { data } = useSWR([`footer`], () => FooterApi() as any, {});
    //const [email, setEmail] = useState('');

    // FIXME: Togglable newsletter view.
    // FIXME: Dynamic copyright copy.

    return (
        <>
            <>
                {/*<EmailCapture>
                    <EmailCaptureContent>
                        <EmailCaptureTitle>
                            Join our newsletter for exclusive deals and discounts
                        </EmailCaptureTitle>
                        <EmailCaptureInput>
                            <Input
                                type="email"
                                placeholder="candy@example.com"
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </EmailCaptureInput>
                        <EmailCaptureSubmit
                            disabled={
                                email.length <= 4 ||
                                !(email.includes('@') && email.includes('.'))
                            }
                            onClick={async () => {
                                try {
                                    const res = await NewsletterApi({
                                        email: email
                                    });
                                    alert('Welcome to the world of Swedish candy!');
                                } catch (error) {
                                    if (error.code == 'duplicate_parameter')
                                        alert(
                                            'You have already subscribed to the newsletter :)'
                                        );
                                    else
                                        alert(
                                            'Something went wrong please try again!'
                                        );
                                }
                            }}
                        >
                            OK
                        </EmailCaptureSubmit>
                    </EmailCaptureContent>
                </EmailCapture>*/}
            </>

            <FooterContainer>
                <FooterWrapper>
                    <FooterBlocksContainer>
                        <FooterBlock>
                            <Logo>
                                {store?.logo?.src && (
                                    <Image
                                        src={store.logo.src}
                                        alt="Logo"
                                        fill
                                    />
                                )}
                            </Logo>

                            <Address
                                dangerouslySetInnerHTML={{
                                    __html:
                                        PrismicDOM.asText(
                                            data?.address,
                                            '<br />'
                                        ) || ''
                                }}
                            />
                        </FooterBlock>

                        {data?.blocks?.map?.((block) => (
                            <FooterBlock key={block.title}>
                                <BlockTitle>{block.title}</BlockTitle>
                                {block?.items.map((item) => (
                                    <Link
                                        key={item.handle}
                                        href={item.handle}
                                        target={
                                            item.handle.startsWith('http')
                                                ? '_blank'
                                                : ''
                                        }
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                            </FooterBlock>
                        ))}
                    </FooterBlocksContainer>

                    {/* TODO: This should be configurable in prismic. */}
                    <FooterBottomSection>
                        <FooterBottomSectionBlock>
                            <PaymentIconsWrapper>
                                <PaymentIconsContainer>
                                    <Image
                                        src={PaymentIcons}
                                        alt="Support payment methods."
                                        fill
                                    />
                                </PaymentIconsContainer>
                            </PaymentIconsWrapper>

                            <LegalAndCopyright>
                                <ImportantLinks>
                                    <Policy href="mailto:dennis@sweetsideofsweden.com">
                                        Contact Us
                                    </Policy>
                                    <Policy href="/about/">About</Policy>
                                    <Policy href="/privacy-policy/">
                                        Privacy Policy
                                    </Policy>
                                </ImportantLinks>
                            </LegalAndCopyright>
                        </FooterBottomSectionBlock>

                        <FooterBottomSectionBlock>
                            <Socials>
                                {store?.social?.map((social) => (
                                    <Social key={social.url} href={social.url}>
                                        <Image
                                            src={`/assets/icons/social/${social.name.toLowerCase()}.svg`}
                                            fill
                                            alt={social.name}
                                            title={social.name}
                                        />
                                    </Social>
                                ))}
                            </Socials>
                            <LegalAndCopyright>
                                <Copyright>
                                    <span>
                                        &copy; 2020-{new Date().getFullYear()}{' '}
                                    </span>
                                    <span>
                                        <Link
                                            href={`https://${Config.domain}/`}
                                        >
                                            {store?.name}
                                        </Link>{' '}
                                        - All rights reserved
                                    </span>
                                </Copyright>
                            </LegalAndCopyright>
                        </FooterBottomSectionBlock>
                    </FooterBottomSection>
                </FooterWrapper>
            </FooterContainer>
        </>
    );
};

export default Footer;
