import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props: any) {
        super(props);

        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.log({ error, errorInfo });
    }

    render() {
        if ((this.state as any).hasError) {
            return (
                <div>
                    <h2>Something went wrong!</h2>
                    <p>Please try again in a little bit, or reach out to us on hello@sweetsideofsweden.com</p>
                </div>
            );
        }

        return (this.props as any).children;
    }
}

export default ErrorBoundary;
