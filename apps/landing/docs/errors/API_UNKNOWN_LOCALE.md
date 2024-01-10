{% card %}

#### Possible Causes

-   Invalid user input.
-   Misconfigured provider(s).

{% /card %}

{% card %}

#### Documentation

An unknown or invalid locale was provided to the API.

{% /card %}

{% card %}

#### Code

```tsx
try {
    Locale.from('hello-world');
} catch {
    throw new UnknownLocaleError();
}
```

{% /card %}
