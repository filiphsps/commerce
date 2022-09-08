import { FunctionComponent } from 'react';
import ReactStars from 'react-rating-stars-component';
import styled from 'styled-components';

const ReviewsLabel = styled.div`
    transform: translateY(0.15rem);
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    opacity: 0.75;
`;

const ReviewsWrapper = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;
    margin: -1.75rem 0px 0px 0px;
    padding: 1rem 0px;
    height: 5rem;

    ${ReviewsLabel} {
        padding-left: 0.5rem;
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
                size={25}
                count={5}
                value={score}
                isHalf={true}
                edit={false}
                activeColor="#D8B309"
            />
            {!hideLabel && (
                <ReviewsLabel onClick={() => onShowReviews?.()}>
                    {Math.floor(score * 100) / 100}{' '}
                    {totalReviews !== undefined &&
                        `(${totalReviews} review${
                            totalReviews != 1 ? 's' : ''
                        })`}
                </ReviewsLabel>
            )}
        </ReviewsWrapper>
    );
};

export default ReviewStars;
