# nordcom commerce - november 2023 - #1

While the much (imo) needed redesign nor the (alleged) performance issues has yet to be a focus due to previous technical debpt; the `v2.0` release still managed to looks great!\
And hey! A few tweaks and improvements related to the aforementioned still managed to sneak in under the radar, how exciting!

## Getting closer to the `v2.0`-release

While the actual list of additions, changes and tweaks is more extensive than I'd be able to cover here;\
I'm still going to try and provide somewhat of an overview of what to expect and why some changes have been done.

### Fancier navigation

![image](https://user-images.githubusercontent.com/108444335/282270508-6bacb499-7c33-4509-9a44-ec83d1bbd7d6.jpeg)

That's right, there's now a much neater header menu on desktop,\
and it's completely rendered on the server which nets us a really nice speed up.\
This is in preparation to migrate from Prismic's legacy slices (components) and in turn support nested menus and a bunch of other features.

### Support for dynamically defining locales

Previously we had to statically generate *every* page for each language,\
that quickly spirals out of control and resulted in the creation of well **over 15,000 pages** and much worse an **8-10 minute build time** every time we deployed.\
That number is now down to just **under 200 pages** total and an average of a whooping **1 minute and 16 seconds build time**.\
As a bonus we no longer have to rebuild and redeploy the page if we (or a tenant, but more on that in a bit) adds a new language or region to the store, it'll now "just work".

### Handling of invalid links

We no longer crash and burn if a user tries to visit with an invalid locale (e.g. one we don't yet support)
this could occur for example when redirecting from the `checkout.sweetsideofsweden.com` Shopify domain.\
Previously our middleware would treat it as a path resulting in strange urls like /en-US/en-DE/products/marabou-milk-chocolate-bar/.

#### It also fixes super common things like

- Extra slashes (`//`).
- Handling of the `shops.nordcom.io` domain (the future admin dashboard for tenants).
- Adding a trailing slash (all of our urls must end with a `/`, this fixes the edge cases where that wasn't true).
- Removing any leftover instances of the `x-default` locales from the path,
- Plus much, much, more.

### Performance, performance, performance

![image](https://user-images.githubusercontent.com/108444335/282270514-e23a10e3-6ba9-4ee4-b1b4-f992103c47f1.jpeg)

The numbers speak for themselves,\
and performance improvements hasn't even been a primary concern for this release but instead make it possible to improve it in the future.\
So, this is just a nice bonus.

### Laying the foundation for `multi-tenancy` support

Remember the `shops.nordcom.io` domain I mentioned a few sections ago?\
Between that and the grunt work of decoupling the the frontend from being hardcoded to Sweet Side of Sweden's store setup;\
we're way closer to be able to realize the plan of releasing the storefront as a "Software as a Service" product (SaaS).\
More details to come in the future.

### Better and automated testing

A lot more of the site is now automatically tested before getting deployed,\
while we're not yet anywhere close to 100% coverage yet it's still way better than before.\
Thanks to this we now automatically deploy updated dependencies ensuring security updates even in my absence.

---

## Call to action

![image](https://user-images.githubusercontent.com/108444335/282270536-840ba328-5a3a-4e3f-9916-d9b12961b37e.jpeg)

While I can't give an estimate yet my goal is **between the 13th and 17th of November**.\
To be able to hit that I need y'all to visit the automatically deploying staging environment and look for and report issues,\
bugs and other roadblocks that need urgent attention.\
I am however not looking for design or feature feedback till after the release of `v2.0` as there's already enough in the backlog.

> **Filiph Siitam Sandström**\
> Chief Technology Officer at Nordcom Group Inc.
