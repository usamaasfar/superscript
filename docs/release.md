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

This triggers the `release-desktop` GitHub Actions workflow, which:
1. Builds `.dmg` and `.app` for both Apple Silicon and Intel
2. Creates a draft GitHub Release with auto-generated release notes
3. Uploads both artifacts to the release

## After the workflow completes

1. Go to the [Releases](../../releases) page on GitHub
2. Review the draft release and release notes
3. Publish when ready

## Version source

Version is defined once in the root `package.json`. Tauri reads it directly via `tauri.conf.json → "version": "../../../package.json"`. No manual sync needed.

## Notes

- Releases are **unsigned** — first launch on macOS requires right-click → Open to bypass Gatekeeper
- The workflow only builds for macOS (aarch64 + x86_64)
