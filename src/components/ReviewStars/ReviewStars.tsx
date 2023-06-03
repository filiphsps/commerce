import { FunctionComponent } from 'react';
import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
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
    text-transform: uppercase;
`;

const ReviewsWrapper = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;
    height: 3rem;
    max-height: 3rem;
    gap: 1rem;

    div.react-stars {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;

        span {
            display: flex !important;
            justify-content: center;
            align-items: center;
            height: 100%;

            svg {
                font-size: 1.75rem;
            }
        }
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
                filledIcon={BsStarFill}
                halfIcon={BsStarHalf}
                emptyIcon={BsStar}
            />
            {!hideLabel && (
                <ReviewsLabel onClick={() => onShowReviews?.()}>
                    {Math.floor(score * 100) / 100}{' '}
                    {totalReviews !== undefined &&
                        `(${totalReviews} review${totalReviews != 1 ? 's' : ''})`}
                </ReviewsLabel>
            )}
        </ReviewsWrapper>
    );
};

export default ReviewStars;
