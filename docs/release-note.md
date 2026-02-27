# Generating a Release Note

## Steps

### 1. Read all previous release notes

Get familiar with the tone and format before writing anything new.

```bash
gh release list
gh release view vX.X.X
# read a few to internalize the tone
```

### 2. Get the commits for this release

```bash
git log vPREV..vNEXT --oneline
```

For each meaningful commit, read the PR for full context:

```bash
gh pr view N
```

Ignore version bump commits — they carry no user-facing information.

### 3. Decide if a screenshot or GIF is needed

Ask yourself: would seeing this change make it more compelling? If yes, ask the developer:

> "Does this change have a visible UI effect worth showing? If so, can you record a short GIF or screenshot?"

If they say yes:

1. Publish the release note immediately with a placeholder where the media will go:

```
![screenshot placeholder — add GIF or screenshot here]()
```

2. The developer uploads the screenshot or GIF directly to the GitHub release page (drag and drop into the release editor).
3. Once uploaded, GitHub generates a URL. Update the release note by replacing the placeholder with the real URL:

```bash
gh release edit vX.X.X --notes "$(cat <<'EOF'
**Tagline.**

![demo](https://github.com/user-attachments/assets/REAL-URL-HERE)

- ...
EOF
)"
```

Changes that typically benefit from visuals:

- New UI elements or interactions
- Before/after behaviour changes
- Anything that affects how the editor looks or feels

Changes that don't need visuals:

- Under-the-hood fixes
- Performance improvements
- Collision/naming logic with no visible UI

### 4. Write the release note

**Format — single feature:**

```
**Tagline that names the theme.**

One or two sentences describing what changed in plain product language.
Focus on what the user experiences, not what the code does.

- Detail — explanation.
- Detail — explanation.
```

**Format — multiple features:**

Flat list. Each bullet is self-contained — bold feature name, dash, one line.

```
**Tagline for the whole release.**

- **Feature one** — what it does.
- **Feature two** — what it does.
- **Feature three** — what it does.
```

**Rules:**

- Bold tagline on the first line — short, punchy, names the theme
- Drop the auto-generated "What's Changed" section entirely — replace with your own copy
- Write for a user, not a developer. No technical terms, no PR numbers, no branch names
- Single feature: bullets are the details. Multiple features: each bullet is a feature, bold name first.
- If no user-facing changes: don't leave it blank. Write a short, honest product thought instead — something true about the app, a principle behind it, or what you're working toward. Examples:
  - *"Stability work. The best tool is the one you forget you're using."*
  - *"Nothing visible this time. We're making sure the foundation is solid before adding more."*
  - *"Under the hood. Good software is mostly invisible work."*
- No marketing language. Short and honest.

**Example — single feature with visual:**

```markdown
**Smarter file naming.**

Notes name themselves from your first line. No more managing Untitled files.

![demo](https://github.com/user-attachments/assets/your-gif-here)

- New notes take their name from the first line you type — automatically.
- Duplicate names resolve gracefully — "name (2)", "name (3)", never an overwrite.
- Collision avoidance applies everywhere: editor, sidebar, and on first save.
```

**Example — multiple features:**

```markdown
**A writing polish release.**

- **Soft line breaks** — notes load and save exactly as written. No more silent rewrites.
- **Writing width** — pick your preferred line width from the menu. It persists.
- **List indentation** — Tab / Shift-Tab to indent and outdent list items.
- **Scroll reset** — switching to a note always starts at the top.
```

### 5. Wait for the workflow to complete

The GitHub Actions workflow builds, signs, notarizes, and publishes the release automatically. Don't edit the notes until it's done.

```bash
gh run watch
```

Or check Actions on GitHub. Once the workflow completes, the release is already live.

### 6. Update the release notes

```bash
gh release edit vX.X.X --notes "$(cat <<'EOF'
**Tagline.**

- Detail — explanation.
- Detail — explanation.
EOF
)"
```

If a visual is needed, developer uploads it to the release page, then update with the real URL:

```bash
gh release edit vX.X.X --notes "$(cat <<'EOF'
**Tagline.**

![demo](https://github.com/user-attachments/assets/REAL-URL-HERE)

- Detail — explanation.
EOF
)"
```
