import { FunctionComponent, useState } from 'react';

import Button from '../Button';
import Input from '../Input';
import { Product } from '@shopify/hydrogen-react/storefront-api-types';
import ReactStars from 'react-rating-stars-component';
import styled from 'styled-components';
import useSWR from 'swr';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;
const ReviewsContainer = styled.section``;
const Review = styled.div`
    padding: var(--block-padding-large);
    margin-bottom: 1rem;
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-text-dark);
`;
const Meta = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
`;
const Title = styled.div`
    font-size: 2rem;
    font-weight: 600;
    line-height: 2.25rem;
    letter-spacing: 0.05rem;
`;
const Author = styled.div`
    padding-top: 0.25rem;
    font-weight: 700;
    font-size: 1.5rem;
    opacity: 0.8;
`;
const Body = styled.div`
    padding-top: 1rem;
    font-size: 1.5rem;
    line-height: 2.25rem;
`;

const FormHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--color-text-primary);
    color: var(--color-text-dark);
    border-radius: var(--block-border-radius);
    padding: 1rem;

    input,
    textarea {
        -webkit-appearance: none;
        display: block;
        padding: 1rem 1rem;
        background: var(--color-text-primary);
        border: 0.2rem solid var(--color-text-primary);
        border-radius: var(--block-border-radius);
        outline: none;
        resize: none;

        &.Body {
            height: 12rem;
        }
    }

    .Button {
        margin-top: 0.25rem;
        max-width: 12rem;
        padding: 1rem;
        font-size: 1.25rem;
        background: #fefefe;
        color: #404756;
        border: 0.2rem solid var(--color-text-primary);

        &:hover {
            background: var(--accent-primary);
            color: var(--color-text-primary);
        }

        &.Button-Disabled {
            color: #404756;
        }
    }
`;

interface ReviewsProps {
    reviews: any;
    product: Product | undefined | null;
}
const Reviews: FunctionComponent<ReviewsProps> = ({ product, reviews: data }) => {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [body, setBody] = useState('');
    const [rating, setRating] = useState(5);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { data: reviews }: any = useSWR(
        [`reviews_${product?.id}`],
        () =>
            fetch('/api/reviews', {
                method: 'post',
                body: JSON.stringify({
                    id: product?.id
                })
            }).then((res) => res.json()),
        {
            fallbackData: data
        }
    );

    if (!product) return null;

    return (
        <Container>
            <ReviewsContainer>
                {reviews?.reviews?.map((review) => (
                    <Review key={review.id}>
                        <Meta>
                            <div>
                                <Title>{review.title}</Title>
                                <Author>By {review.author}</Author>
                            </div>
                            <ReactStars
                                size={20}
                                count={5}
                                value={review.rating}
                                isHalf={true}
                                edit={false}
                                activeColor="#D8B309"
                            />
                        </Meta>
                        <Body>{review.body}</Body>
                    </Review>
                ))}
            </ReviewsContainer>
            {!submitted ? (
                <Form>
                    <FormHeader>
                        <Title>Leave a review</Title>
                        <ReactStars
                            size={32}
                            count={5}
                            isHalf={false}
                            edit={!loading}
                            value={rating}
                            onChange={setRating}
                            activeColor="#D8B309"
                        />
                    </FormHeader>

                    <Input
                        disabled={loading}
                        placeholder="Name"
                        onChange={(e) => setAuthor(e.target.value)}
                    />
                    <Input
                        disabled={loading}
                        placeholder="Title"
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <textarea
                        disabled={loading}
                        placeholder="Your review goes here :)"
                        onChange={(e) => setBody(e.target.value)}
                    />
                    <Button
                        disabled={!title || !author || !body || loading}
                        onClick={async () => {
                            setLoading(true);
                            const res = await fetch('/api/reviews/create', {
                                method: 'post',
                                headers: {
                                    'content-type': 'text/plain'
                                },
                                body: JSON.stringify({
                                    id: reviews.product_id,
                                    rating,
                                    title,
                                    author,
                                    body
                                })
                            });

                            if (res.status === 200) setSubmitted(true);
                        }}
                    >
                        Submit
                    </Button>
                </Form>
            ) : null}
        </Container>
    );
};

export default Reviews;
