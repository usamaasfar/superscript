# Branching

## Branches

```
main                    — production. only released code lives here.
draft-24-02-2026        — unreleased changes waiting to ship. short-lived.
improved-command-bar    — active work. named after what you're building.
```

## Daily work

Create a branch named after what you're building, work on it, commit as you go.

```bash
git checkout -b improved-command-bar
# ... make changes, commit
git push -u origin improved-command-bar
```

## Draft branch

`draft-DD-MM-YYYY` is a holding branch for unreleased changes not tied to any active feature — docs updates, small tweaks, anything not ready to ship yet. The date tells you when it was created.

```bash
# create
git checkout -b draft-24-02-2026

# commit changes to it
git add .
git commit -m "..."
```

It's short-lived. When you're ready to release, merge it into your current working branch then delete it locally and remotely:

```bash
git checkout improved-command-bar
git merge draft-24-02-2026
git branch -d draft-24-02-2026
git push origin --delete draft-24-02-2026
```

Before any release, always check if a draft branch exists and what it contains. See [`docs/release.md`](release.md) for how that works.

## Releasing

When the work on your branch is done and draft is merged in:

1. Open a PR from your working branch → `main`
2. Once the PR is merged, cut the release

See [`docs/release.md`](release.md) for the release process.
See [`docs/release-note.md`](release-note.md) for writing release notes.
