# Releasing Superscript

## How to release

Bump the version and push the tag:

```bash
# patch: 0.0.0 → 0.0.1
npm version patch

# minor: 0.0.0 → 0.1.0
npm version minor

# major: 0.0.0 → 1.0.0
npm version major

# Push the commit + tag
git push --follow-tags
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
