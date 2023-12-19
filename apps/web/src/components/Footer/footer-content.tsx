'use client';

import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import styles from './footer.module.scss';

const LegalAndCopyright = styled.div`
    display: flex;
    align-items: flex-end;
    justify-self: flex-end;
    margin: var(--block-spacer-large) 0;

    @media (min-width: 950px) {
        height: 4rem;
        margin: 0;
    }
`;
const FooterBottomSectionBlock = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    gap: var(--block-spacer);

    &:nth-child(2) {
        align-items: flex-start;

        @media (min-width: 950px) {
            align-items: flex-end;
        }
    }

    @media (min-width: 950px) {
        justify-content: flex-end;
        align-items: flex-start;
        gap: 0.5em;
        gap: var(--block-spacer-large);
    }
`;
const ImportantLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--block-spacer);

    @media (min-width: 950px) {
        display: grid;
        grid-template-columns: auto auto auto;
        gap: var(--block-spacer-large);
        height: 3rem;
        align-items: flex-end;
        justify-self: flex-end;
    }
`;

const Copyright = styled.div`
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: normal;
    text-transform: uppercase;
    text-align: left;

    @media (min-width: 950px) {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        gap: var(--block-spacer-small);
        height: 3rem;
        font-weight: 800;
        text-align: right;
        font-size: 1.25rem;
        line-height: 1;
    }
`;
const Policy = styled(Link)`
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;

    @media (min-width: 950px) {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        height: 3rem;
        padding: 0;
        font-weight: 800;
        font-size: 1.25rem;
        line-height: 1;
    }
`;
const Socials = styled(ImportantLinks)`
    display: flex;
    height: 3rem;
    width: 100%;

    @media (min-width: 950px) {
        justify-content: flex-end;
        align-items: flex-start;
    }
`;
const Social = styled(Link)`
    position: relative;
    width: 3.5rem;
    height: 3.5rem;

    @media (min-width: 950px) {
        width: 2.5rem;
        height: 2.5rem;
    }

    img {
        object-fit: contain;
    }
`;

export type FooterContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    store: StoreModel;
};
const FooterContent = ({ locale, i18n, store }: FooterContentProps) => {
    const { t } = useTranslation('common', i18n);

    const [deferred, setDeferred] = useState<any>(null);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setDeferred(
                <>
                    <iframe
                        title="Nordcom Status"
                        src="https://status.nordcom.io/badge?theme=dark"
                        width="auto"
                        height="30"
                        frameBorder="0"
                        scrolling="no"
                        loading="lazy"
                    />
                </>
            );
        }, 6750);

        () => clearTimeout(timeout);
    }, []);

    const year = new Date().getFullYear();

    return (
        <>
            {/* TODO: This should be configurable in prismic. */}
            <div className={styles.legal}>
                <FooterBottomSectionBlock>
                    <div className={styles['status-badge']}>{deferred}</div>
                    <AcceptedPaymentMethods store={store!} />
                    <LegalAndCopyright>
                        <ImportantLinks>
                            <Policy href="/contact/">Contact</Policy>
                            <Policy href="https://nordcom.io/legal/terms-of-service/" target="_blank">
                                Terms of Service
                            </Policy>
                            <Policy href="/privacy-policy/">Privacy Policy</Policy>
                        </ImportantLinks>
                    </LegalAndCopyright>
                </FooterBottomSectionBlock>

                <FooterBottomSectionBlock>
                    <Socials
                    // TODO: Add LinkedIn and YouTube icons.
                    >
                        {store?.social
                            .filter(({ name }) => !['linkedin', 'youtube'].includes(name.toLowerCase()))
                            .map((social) => (
                                <Social className={styles['social-icon']} key={social.url} href={social.url}>
                                    <Image
                                        src={`/assets/icons/social/${social.name.toLowerCase()}.svg`}
                                        fill
                                        alt={social.name}
                                        title={social.name}
                                        sizes="35px"
                                    />
                                </Social>
                            ))}
                        <Link className={styles.flag} href="/countries/" title={t('language-and-region-settings')}>
                            <CurrentLocaleFlag locale={locale} />
                        </Link>
                    </Socials>
                    <LegalAndCopyright>
                        <Copyright>
                            &copy; {`${year !== 2023 ? '2023-' : ''}${year} `}
                            <Link href={`https://nordcom.io/`} target="_blank">
                                Nordcom Group Inc.
                            </Link>
                        </Copyright>
                    </LegalAndCopyright>
                </FooterBottomSectionBlock>
            </div>
        </>
    );
};

export default FooterContent;
