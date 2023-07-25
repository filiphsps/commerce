import { captureException } from '@sentry/nextjs';

import { FunctionComponent, memo, useEffect, useState } from 'react';

import styled from 'styled-components';
import { NewsletterApi } from '../../api/newsletter';
import { Button } from '../Button';
import { Input } from '../Input';

const Container = styled.div`
    position: relative;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 12rem;
    padding: var(--block-padding-large);
    background: var(--accent-secondary-light);
`;
const EmailCaptureContent = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 2rem;
    max-width: 100%;
    width: 1465px;
    margin: 0px auto;
    padding: var(--block-padding-large);

    @media (max-width: 950px) {
        display: flex;
        flex-direction: column;
    }
`;
const EmailCaptureTitle = styled.div`
    font-size: 4.25em;
    line-height: 4.25rem;
    font-weight: 700;
    color: var(--accent-primary);

    @media (min-width: 950px) {
        text-transform: uppercase;
    }

    @media (max-width: 950px) {
        padding: 0px;
        font-size: 5em;
        line-height: 5.25rem;
        text-align: center;
    }
`;
const EmailCaptureDescription = styled.div`
    width: 48rem;
    margin: 1rem 0px 0px 0px;
    max-width: 100%;
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 600;
    color: var(--accent-primary);

    @media (min-width: 950px) {
        b {
            overflow: hidden;
            height: 100%;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            white-space: nowrap;
            background: var(--accent-secondary-dark);
            padding: 0px 0.25rem;
            height: 2.25rem;
            line-height: 2rem;
        }
    }

    @media (max-width: 950px) {
        max-width: unset;
        width: 100%;
        margin: 0px;
        padding: 0px 1rem;
        font-size: 2rem;
        line-height: 2.5rem;
        text-align: center;
    }
`;

const Form = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    align-items: stretch;
    gap: var(--block-spacer-small);
    margin: 0px 1rem;
    height: 4rem;
    max-height: 6rem;

    @media (min-width: 950px) {
        max-height: 6rem;
        margin: 0px;
        grid-template-columns: auto auto;
        justify-content: start;
    }
`;
const EmailCaptureInput = styled(Input)`
    max-height: 100%;
    height: 100%;
    font-size: 1.5rem;
    text-align: center;
    border-width: 0px;

    @media (min-width: 950px) {
        text-align: left;
    }
`;
const EmailCaptureSubmit = styled(Button)`
    display: block;
    height: 100%;
    width: 100%;
    font-size: 1.5rem;
`;

interface EmailCaptureProps {}
const EmailCapture: FunctionComponent<EmailCaptureProps> = ({}) => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setHidden(!!localStorage?.getItem('SUBSCRIBED'));
    }, []);

    if (hidden) return null;

    return (
        <Container>
            <EmailCaptureContent>
                {(!subscribed && (
                    <div>
                        <EmailCaptureTitle>Don&apos;t Miss out</EmailCaptureTitle>
                        <EmailCaptureDescription>
                            Sign up to our newsletter and get <b>10% OFF</b> your next order.
                        </EmailCaptureDescription>
                    </div>
                )) || (
                    <div>
                        <EmailCaptureTitle>Thank you!</EmailCaptureTitle>
                        <EmailCaptureDescription>
                            Your coupon code will arrive in your inbox shortly!
                        </EmailCaptureDescription>
                    </div>
                )}

                {(!subscribed && (
                    <Form>
                        <EmailCaptureInput
                            type="email"
                            placeholder="candy@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <EmailCaptureSubmit
                            /*disabled={
                                email.length <= 4 || !(email.includes('@') && email.includes('.'))
                            }*/
                            onClick={async () => {
                                try {
                                    await NewsletterApi({
                                        email: email
                                    });
                                    localStorage.setItem('SUBSCRIBED', 'true');
                                    setSubscribed(true);
                                } catch (error) {
                                    if (error.code == 'duplicate_parameter') {
                                        alert(`You're already subscribed to our newsletter!`);
                                        localStorage.setItem('SUBSCRIBED', 'true');
                                        setHidden(true);
                                        return;
                                    }

                                    captureException(error);
                                    alert('Something went wrong please try again!');
                                }
                            }}
                        >
                            Sign up
                        </EmailCaptureSubmit>
                    </Form>
                )) ||
                    null}
            </EmailCaptureContent>
        </Container>
    );
};

export default memo(EmailCapture);
