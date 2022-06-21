import { FunctionComponent } from 'react';
import ReactStars from 'react-rating-stars-component';
import styled from 'styled-components';

const ReviewsLabel = styled.div`
    margin: 0.075rem 0 0 0;
    font-size: 1.5rem;
    text-transform: uppercase;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }
`;

const ReviewsWrapper = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;

    ${ReviewsLabel} {
        padding-left: 1rem;
        margin: -0.05rem 0px 0px 0px;
    }

    span {
        margin-right: 0.25rem;
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
                size={20}
                count={5}
                value={score}
                isHalf={true}
                edit={false}
            />
            {!hideLabel && (
                <ReviewsLabel onClick={() => onShowReviews?.()}>
                    {score}{' '}
                    {totalReviews !== undefined &&
                        `(${totalReviews} review${
                            totalReviews > 1 ? 's' : ''
                        })`}
                </ReviewsLabel>
            )}
        </ReviewsWrapper>
    );
};

export default ReviewStars;
