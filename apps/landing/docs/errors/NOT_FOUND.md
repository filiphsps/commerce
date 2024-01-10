{% card %}

#### Possible Causes

-   Requesting an invalid/non-existent resource.
-   Requesting a previously removed resource.
-   Trying to access a non-existent path or route.

{% /card %}

{% card %}

#### Documentation

This error is thrown when a route or a resource cannot be found, for example if you're requesting a non-existent product handle or asset.

{% /card %}

{% card %}

#### Code

```tsx
const product = await product(handle);
if (product) return product;

throw new NotFoundError();
```

{% /card %}
