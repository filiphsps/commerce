import { Content, asHTML } from '@prismicio/client';

import ContentBlock from '../../src/components/ContentBlock';
import { FiChevronUp } from 'react-icons/fi';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import TextBlock from '../../src/components/TextBlock';
import styled from 'styled-components';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

const Summary = styled.summary`
    display: grid;
    grid-template-columns: 2rem auto;
    gap: 1rem;
    justify-self: flex-start;
    align-items: center;
    padding: 0px 0px 0.5rem 0px;
    font-weight: 700;
    font-size: 1.75rem;
    line-height: 2.25rem;
    text-transform: uppercase;
    cursor: pointer;
    user-select: none;
    border-bottom: 0.2rem solid var(--color-text-dark);
    transition: 150ms all ease-in-out;

    &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);

        .Icon {
            color: var(--accent-primary);
        }
    }

    .Icon {
        width: 2rem;
        font-size: 1.75rem;
        line-height: 2rem;
        transition: 150ms ease-in-out;
    }
`;
const Details = styled.details`
    transition: 150ms ease-in-out;

    &[open] ${Summary} {
        margin-bottom: 1rem;
        .Icon {
            rotate: 180deg;
        }
    }
`;

/**
 * Props for `CollapsibleText`.
 */
export type CollapsibleTextProps = SliceComponentProps<Content.CollapsibleTextSlice>;

/**
 * Component for "CollapsibleText" Slices.
 */
const CollapsibleText = ({ slice }: CollapsibleTextProps): JSX.Element => {
    return (
        <Container>
            <ContentBlock>
                <PageContent>
                    <Details className={`Slice-Collapse-Body`}>
                        <Summary>
                            <FiChevronUp className="Icon" /> {slice?.primary?.title}
                        </Summary>

                        {<TextBlock body={asHTML(slice?.primary?.text || '') || ''} />}
                    </Details>
                </PageContent>
            </ContentBlock>
        </Container>
    );
};

export default CollapsibleText;
