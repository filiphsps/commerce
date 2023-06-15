import * as Sentry from '@sentry/nextjs';

import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Button from '../Button';
import Input from '../Input';
import { NewsletterApi } from '../../api/newsletter';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 12rem;
    padding: 2rem 0px;
    margin-top: 1rem;
    background: var(--accent-secondary-light);
`;
const EmailCaptureContent = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    max-width: 100%;
    width: 1465px;
    padding: 1rem 2rem;

    @media (max-width: 950px) {
        display: flex;
        flex-direction: column;
        padding: 1rem;
    }
`;
const EmailCaptureTitle = styled.div`
    text-transform: uppercase;
    font-size: 4.25em;
    line-height: 4.25rem;
    font-weight: 800;
    color: var(--accent-primary);

    @media (max-width: 950px) {
        padding: 0px;
        font-size: 6.25em;
        line-height: 6.25rem;
        text-align: center;
    }
`;
const EmailCaptureDescription = styled.div`
    width: 48rem;
    margin: 1rem 0px 0px 0px;
    max-width: 100%;
    text-transform: uppercase;
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
            //color: var(--accent-secondary-dark);
            background: var(--accent-secondary-dark);
            padding: 0px 0.25rem;
            height: 2.25rem;
            line-height: 2rem;
        }
    }

    @media (max-width: 950px) {
        max-width: unset;
        width: 100%;
        margin: 1rem 0px;
        font-size: 1.5em;
        line-height: 1.75rem;
        text-align: center;
    }
`;

const Form = styled.div`
    display: grid;
    grid-template-columns 1fr;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 0px 1rem;

    @media (min-width: 950px) {
        padding: 0px;
        grid-template-columns auto auto;
        justify-content: start;
    }
`;
const EmailCaptureInput = styled.div`
    width: 100%;

    input,
    .Input {
        height: 4.5rem;
        width: 100%;
        padding: calc(1.25rem - 0.04rem) 1.75rem;
        background: #fefefe;
        border-color: var(--accent-primary);
        font-size: 1.5rem;
        text-align: center;

        @media (min-width: 950px) {
            text-align: left;
            height: 4rem;
            padding: calc(1rem - 0.04rem) 1.75rem;
        }
    }
`;
const EmailCaptureSubmit = styled(Button)`
    height: 4.5rem;
    width: 100%;
    padding: 1.25rem 1.75rem;
    font-size: 1.5rem;

    @media (min-width: 950px) {
        height: 4rem;
        padding: 1rem 1.75rem;
    }
`;

interface EmailCaptureProps {}
const EmailCapture: FunctionComponent<EmailCaptureProps> = ({}) => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        setHidden(!!localStorage.getItem('SUBSCRIBED'));
    }, []);

    if (hidden) return null;

    return (
        <Container>
            <EmailCaptureContent>
                {(!subscribed && (
                    <div>
                        <EmailCaptureTitle>Don&apos;t Miss out</EmailCaptureTitle>
                        <EmailCaptureDescription>
                            Sign up to our newsletter and get <b>10% off</b> your next order.
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
                        <EmailCaptureInput>
                            <Input
                                type="email"
                                placeholder="candy@example.com"
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </EmailCaptureInput>
                        <EmailCaptureSubmit
                            disabled={
                                email.length <= 4 || !(email.includes('@') && email.includes('.'))
                            }
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

                                    Sentry.captureException(error);
                                    alert('Something went wrong please try again!');
                                }
                            }}
                        >
                            Sign up now
                        </EmailCaptureSubmit>
                    </Form>
                )) ||
                    null}
            </EmailCaptureContent>
        </Container>
    );
};

export default memo(EmailCapture);
