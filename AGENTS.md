# AGENTS.md

## Project

> _the best tool is the one you forget you're using._
> — _superscript_

Superscript is a **macOS notes app for people who just want to write**. No accounts, no sync services, no settings to configure. Open it and there's a window. You write. It saves.

Notes are plain `.md` files stored in a folder you own — iCloud Drive by default, auto-created on first launch. Open them in any editor, back them up however you want. Nothing is locked in.

The app gets out of the way: no toolbar, no sidebar clutter, no formatting panels. Just a focused writing surface with markdown under the hood. Files are named from your first line automatically. The command bar (`⌘K`) lets you switch notes instantly. Auto-save runs silently in the background. Updates install themselves.

Built with Tauri 2 + React 19 + TypeScript. Ships as a signed and notarized macOS app for both Apple Silicon and Intel.

## Repo layout

```
apps/desktop/
  src/
    App.tsx                  — root component, wires all hooks
    hooks/
      useFileSystem.ts       — folder init, readDir, loadFolder, pickFolder
      useAutoSave.ts         — 800ms debounced save; names new files from content
      useRename.ts           — rename with collision avoidance
      useAppearance.ts       — theme/font/size/cursor preference listeners
      useAutoUpdate.ts       — background update checks via tauri-plugin-updater
      useMenuEvents.ts       — Tauri menu event listeners (new note, change folder, preferences)
      useNoteNavigation.ts   — note switching with flush-before-load
      useTitleVisibility.ts  — flash title bar on interaction, hide after 1200ms
      useWindowGuards.ts     — window focus/blur guards (new page, close behaviour)
    command/
      CommandBar.tsx         — Cmd+K file switcher (cmdk)
    editor/
      Editor.tsx             — ProseMirror editor component
      markdown.ts            — parse/serialize markdown ↔ ProseMirror doc
      plugins/
        caret.ts             — animated caret plugin (line / underline styles)
    styles/
      globals.css            — base styles and CSS variables
      editor.css             — editor-specific styles
      command.css            — command bar styles
    utils/file.ts            — stemFromContent, uniqueFilePath, newFilePath, getFileName
  src-tauri/
    src/lib.rs               — plugin init, native menu, menu→event bridge
    capabilities/default.json
    tauri.conf.json          — app config (identifier: com.usama.superscript)
    Cargo.toml
```

## Architecture

### File system

1. `useFileSystem` checks `localStorage.rootDir` → tries iCloud path → falls back to folder picker.
2. `loadDir` → `readDir` → filter `.md` → `stat` for mtime → sort newest-first.
3. New files: named from first line of content via `stemFromContent`. Falls back to timestamp.
4. Collisions: `uniqueFilePath` → `name (2)`, `name (3)` etc. Case-insensitive (APFS). Never overwrites.

### Tauri plugins

| Plugin                 | Used for                                                  |
| ---------------------- | --------------------------------------------------------- |
| `tauri-plugin-fs`      | readDir, readTextFile, writeTextFile, rename, stat, mkdir |
| `tauri-plugin-dialog`  | folder picker                                             |
| `tauri-plugin-opener`  | open external links                                       |
| `tauri-plugin-updater` | silent background updates                                 |
| `tauri-plugin-process` | relaunch after update                                     |
| `@tauri-apps/api/path` | `homeDir()` for iCloud path                               |

### Menu → frontend events

Rust emits Tauri events; React listens with `listen()`:

- `new_note` → create new file
- `change_folder` → call `pickFolder()`
- `font_change` / `size_change` / `appearance_change` / `cursor_change` → update preferences

### Editor

ProseMirror with a custom markdown schema. h1–h3, bold, italic, inline code, code blocks, blockquotes, ordered/unordered lists, strikethrough. Markdown input rules (`#`, `>`, `-`, `1.`). Soft line breaks preserved exactly on load and save.

### Code conventions

- React 19 functional components + hooks. No Redux, no Zustand.
- Strict TypeScript. Double quotes (Biome enforced).
- Tailwind CSS v4 + CSS variables (`--bg`, `--fg`, …).
- Preferences in `localStorage`: `rootDir`, `font`, `size`, `appearance`, `cursor`.

## Docs

- [`docs/release.md`](docs/release.md) — how to cut a release
- [`docs/release-note.md`](docs/release-note.md) — how to write release notes

---

## Product guardian

Superscript's philosophy is: **get out of the way**. No friction, no clutter, no features that make the user manage the app instead of using it.

If a requested feature or implementation conflicts with this — adds UI complexity, introduces settings the user has to think about, pulls focus away from writing, or breaks the "just works" contract — **push back**. Say why it doesn't fit. Propose a simpler alternative if one exists, or recommend not doing it at all.

This is not about being difficult. It's about protecting what makes the app good. A feature that doesn't belong will always cost more than it gives.

Ask: _does this make writing easier, or does it make the app harder to ignore?_ If it's the latter, say so before writing a single line of code.

---

## How I work

### Plan first

- Enter plan mode for ANY non-trivial task — 3+ steps, architectural decisions, or touching multiple files.
- Write a clear spec before writing code. Ambiguity upfront costs less than wrong work.
- If something goes sideways mid-task, stop and re-plan. Don't push through.
- Use plan mode for verification steps, not just building.

### Subagent strategy

- Use subagents to keep the main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- One task per subagent — focused execution, not sprawl.

### Read before touching

- Never suggest or make changes to code that hasn't been read first.
- Understand the existing pattern before deciding how to extend it.

### Minimal impact

- Only touch what the task requires. No opportunistic refactors, no added comments, no cleanup on the side.
- The right solution is the smallest one that works.
- No abstractions for hypothetical future needs. Three similar lines beat a premature helper.
- Implementation must be minimalist and follow standard practices. Write idiomatic code. Never overcomplicate or over-engineer.
- Truth is simple. Simple is beautiful.

### Verify before done

- Never declare a task complete without proving it works.
- Run `bun run check` and `bun run build`. If they fail, fix them — don't report done.
- Ask: "Would a staff engineer approve this?"

### Demand elegance (balanced)

- For non-trivial changes, pause and ask: "Is there a more elegant way?"
- If a fix feels hacky: think it through properly and implement the clean solution.
- Skip this for simple, obvious fixes — don't over-engineer.

### Autonomous bug fixing

- When given a bug: just fix it. No hand-holding needed.
- Point at logs, errors, and behaviour — then resolve them.
- Fix failing builds and checks without being told how.

### Self-improvement

- After any correction from the user: note the pattern and don't repeat it.
- Write rules for yourself that prevent the same mistake next time.
