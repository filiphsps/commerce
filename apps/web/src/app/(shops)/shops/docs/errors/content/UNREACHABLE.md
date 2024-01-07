{% card %}

#### Possible Causes

-   This error should in theory never occur, please reach out to your Nordcom Commerce contact if you have the misfortune to experience it.

{% /card %}

{% card %}

#### Documentation

An theoretical unreachable code path has been taken (eg, switch case fall through, if else block or similar), this is a sign of a greater underlying problem and should be reported to Nordcom Group Inc. ASAP so we can investigate it.

{% /card %}

{% card %}

#### Code

```tsx
if (true) {
    return 'hello';
}

// This should be unreachable.
throw new UnreachableError();
```

{% /card %}
