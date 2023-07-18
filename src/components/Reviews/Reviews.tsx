import { FunctionComponent, useState } from 'react';
import { Subtitle, Title } from '../PageHeader/PageHeader';

import { Button } from '../Button';
import { Input } from '../Input';
import { Product } from '@shopify/hydrogen-react/storefront-api-types';
import ReactStars from 'react-rating-stars-component';
import styled from 'styled-components';
import useSWR from 'swr';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
`;
const ReviewsContainer = styled.section`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
`;
const Review = styled.div`
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-dark);
`;
const Meta = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
`;
const ReviewTitle = styled(Title)``;
const Author = styled(Subtitle)`
    opacity: 0.75;
`;
const Body = styled.div`
    margin-top: 1rem;
    font-size: 1.5rem;
    line-height: 2.25rem;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-bright);
    color: var(--color-dark);
`;

const FormHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Form = styled.section`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    background: var(--color-bright);
    color: var(--color-dark);
    border-radius: var(--block-border-radius);

    input,
    textarea {
        appearance: none;
        display: block;
        padding: var(--block-padding-large) var(--block-padding-large);
        background: var(--color-bright);
        border: var(--block-border-width) solid var(--color-block);
        border-radius: var(--block-border-radius);
        outline: none;
        resize: none;
        font-size: 1.5rem;
        line-height: 2.25rem;

        &.Body {
            height: 12rem;
        }
    }

    ${Button} {
        max-width: 18rem;
        padding: var(--block-padding-large);

        &&:disabled,
        &[disabled] {
            color: var(--color-block);
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
                                <ReviewTitle>{review.title}</ReviewTitle>
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
                        <ReviewTitle>Leave a review</ReviewTitle>
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
