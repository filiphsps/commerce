import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';

import { FunctionComponent } from 'react';
import { Pluralize } from 'src/util/Pluralize';
import ReactStars from 'react-rating-stars-component';
import styled from 'styled-components';

const ReviewsLabel = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    font-size: 1.5rem;
    line-height: 100%;
    font-weight: 600;
`;

const ReviewsWrapper = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;
    height: 3rem;
    max-height: 3rem;
    gap: var(--block-spacer);

    div.react-stars {
        display: flex;
        flex-direction: row;
        gap: var(--block-spacer-small);
        overflow: unset !important;
        margin-top: -0.25rem;

        span {
            display: flex !important;
            justify-content: center;
            align-items: center;
            height: 100%;
            overflow: unset !important;

            svg {
                font-size: 1.75rem;
            }
        }
    }
`;

const IconWrapper = styled.div`
    svg {
        filter: drop-shadow(0px 0px 10px var(--color-block-shadow));
    }
`;

interface ReviewStarsProps {
    score: number;
    totalReviews?: number;
    hideLabel?: boolean;
    onShowReviews?: () => void;
}
const ReviewStars: FunctionComponent<ReviewStarsProps> = ({
    score,
    totalReviews,
    hideLabel,
    onShowReviews
}) => {
    if (!totalReviews) return null;

    return (
        <ReviewsWrapper>
            <ReactStars
                size={18}
                count={5}
                value={score}
                isHalf={true}
                edit={false}
                a11y={false}
                activeColor="#D8B309"
                filledIcon={
                    <IconWrapper>
                        <BsStarFill />
                    </IconWrapper>
                }
                halfIcon={
                    <IconWrapper>
                        <BsStarHalf />
                    </IconWrapper>
                }
                emptyIcon={
                    <IconWrapper>
                        <BsStar />
                    </IconWrapper>
                }
            />
            {!hideLabel && (
                <ReviewsLabel onClick={() => onShowReviews?.()}>
                    {totalReviews} {Pluralize({ count: totalReviews, noun: 'review' })}
                </ReviewsLabel>
            )}
        </ReviewsWrapper>
    );
};

export default ReviewStars;
