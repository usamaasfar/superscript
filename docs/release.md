# Releasing Superscript

## How to release

The version commit must be a single clean commit (e.g. `0.1.4`) containing all pending changes alongside the version bump. Do **not** use `npm version` directly as it only commits `package.json`.

```bash
# 1. Bump version in package.json only (no commit, no tag)
npm version patch --no-git-tag-version   # patch: 0.0.0 → 0.0.1
npm version minor --no-git-tag-version   # minor: 0.0.0 → 0.1.0
npm version major --no-git-tag-version   # major: 0.0.0 → 1.0.0

# 2. Stage package.json plus any other pending changes (e.g. Cargo.lock)
git add package.json apps/desktop/src-tauri/Cargo.lock

# 3. Commit and tag — commit message is just the version number
git commit -m "0.1.4"
git tag v0.1.4

# 4. Push commit and tag
git push && git push origin v0.1.4
```

This triggers the `Release Desktop` GitHub Actions workflow, which:

1. Builds `.dmg`, `.app`, and updater artifacts for both Apple Silicon and Intel
2. Signs each binary with a Developer ID Application certificate
3. Notarizes the signed app with Apple (Gatekeeper-trusted)
4. Creates a GitHub Release with auto-generated release notes
5. Uploads all artifacts including a `latest.json` (used by the auto-updater)

## After the workflow completes

The release publishes automatically. Existing installs will detect the new version on next launch and update silently.

## Version source

Version is defined once in the root `package.json`. Tauri reads it directly via `tauri.conf.json → "version": "../../../package.json"`. No manual sync needed.

## Notes

- Releases are **signed and notarized** — macOS opens the app immediately with no Gatekeeper prompt
- The workflow only builds for macOS (aarch64 + x86_64)
