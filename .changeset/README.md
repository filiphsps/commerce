# Changesets

This directory tracks pending version bumps for the `@tagtree/*` packages.
Other packages in this monorepo are ignored — see `.changeset/config.json`.

## Adding a changeset

When you make a change to any `@tagtree/*` package that should ship in the
next release, run:

    pnpm changeset

Pick the packages, the bump type (patch/minor/major), and write a short
note. The CLI commits a markdown file to this directory.

## Releasing

Merging to `master` with pending changeset files triggers the release
workflow (`.github/workflows/release.yml`):

1. If there are pending changesets, the workflow opens (or updates) a
   "Version Packages" PR that consolidates all bumps + changelog entries.
2. When that PR is merged, the workflow runs `changeset publish` which
   pushes each newly-versioned non-private package to npm.

The `@tagtree/*` packages are currently `private: true`, so the publish
step is a no-op. Flip them to `private: false` when you're ready to
ship a real release; the first merge to master after that flip will
publish.
