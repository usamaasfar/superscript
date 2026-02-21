# AGENTS.md

## Project overview

Superscript is a **macOS desktop markdown notes app** built with Tauri 2 + React 19 + TypeScript.
It stores notes as plain `.md` files in a user-selected folder. By default it uses an iCloud Drive folder (`~/Library/Mobile Documents/com~apple~CloudDocs/Superscript`); if iCloud is unavailable the user picks a folder manually.

Monorepo layout (Turborepo):

```
apps/desktop/          — the only app
  src/                 — React frontend (Vite)
    App.tsx            — root component, wires all hooks together
    hooks/
      useFileSystem.ts — folder init (iCloud default → picker), readDir, loadFolder, pickFolder
      useAutoSave.ts   — 800 ms debounced writeTextFile; new files get timestamp names
      useRename.ts     — rename with collision check
      useAppearance.ts — theme/font/size preference listeners (Tauri events)
      useAutoUpdate.ts — tauri-plugin-updater background update checks
    command/
      CommandBar.tsx   — Cmd+K file switcher (cmdk)
    editor/            — ProseMirror rich-text ↔ markdown editor
      markdown.ts      — parse/serialize markdown ↔ ProseMirror doc
    utils/file.ts      — newFilePath, getParentDir, getFileName, getFileStem
  src-tauri/           — Rust backend
    src/lib.rs         — plugin init, native menu, menu→event bridge
    capabilities/default.json — Tauri permission whitelist
    tauri.conf.json    — app config (identifier: com.usama.superscript)
    Cargo.toml         — Rust deps
```

## Setup commands

- **Install dependencies**:
  ```bash
  bun install
  ```
- **Start development server**:
  ```bash
  bun tauri dev
  ```
- **Build for production**:
  ```bash
  bun tauri build
  ```

## Code style

- **Framework**: React 19 + TypeScript 5.
- **Styling**: Plain CSS with CSS variables (`--bg`, `--fg`, …) + Tailwind CSS v4.
- **Linting & Formatting**: Biome.
  - Lint: `bun run lint`
  - Format: `bun run format`
  - Type-check + lint: `bun run check`
- **Conventions**:
  - Functional components with hooks; no Redux/Zustand.
  - Strict TypeScript.
  - Double quotes (Biome enforced).
  - All persistence via `localStorage` (key: `rootDir`, `font`, `size`, `appearance`).

## Architecture notes

### File system flow

1. `useFileSystem` init: checks `localStorage.rootDir` → tries iCloud folder → falls back to `open()` dialog.
2. iCloud path: `~/Library/Mobile Documents/com~apple~CloudDocs/Superscript` (created with `mkdir({recursive:true})` if absent).
3. `loadDir(dir)` → `readDir` → filter `.md` → `stat` for mtime → sort newest-first.
4. New files: `newFilePath(dir)` returns `YYYY-MM-DD HH.mm.ss.SSS.md`.

### Tauri plugin usage

| Plugin                 | JS import                    | Used for                                                  |
| ---------------------- | ---------------------------- | --------------------------------------------------------- |
| `tauri-plugin-fs`      | `@tauri-apps/plugin-fs`      | readDir, readTextFile, writeTextFile, rename, stat, mkdir |
| `tauri-plugin-dialog`  | `@tauri-apps/plugin-dialog`  | folder picker (`open({directory:true})`)                  |
| `tauri-plugin-opener`  | `@tauri-apps/plugin-opener`  | open external links                                       |
| `tauri-plugin-updater` | `@tauri-apps/plugin-updater` | silent background updates                                 |
| `tauri-plugin-process` | `@tauri-apps/plugin-process` | relaunch after update                                     |
| `@tauri-apps/api/path` | built-in                     | `homeDir()` for resolving iCloud path                     |

### Permissions (capabilities/default.json)

`fs:allow-home-read-recursive`, `fs:allow-home-write-recursive`, `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-read-dir`, `fs:allow-stat`, `fs:allow-mkdir`, `dialog:allow-open`

### Menu → frontend events

Rust emits Tauri events; React listens with `listen()`:

- `new_note` → create new file
- `change_folder` → call `pickFolder()`
- `font_change` / `size_change` / `appearance_change` → update preferences

### Editor

ProseMirror with a custom markdown schema. Supports headings (h1-h3), bold, italic, inline code, code blocks, blockquotes, ordered/unordered lists, strikethrough. Input rules for markdown shortcuts (`#`, `>`, `-`, `1.`).

## Key behaviors

- **Default folder**: iCloud Drive → `Superscript/` (auto-created). Falls back to folder picker if iCloud is unavailable.
- **Autosave**: 800 ms after last keystroke via `writeTextFile`.
- **Cmd+K**: file switcher; re-sorts by mtime on open.
- **Cmd+N**: new page.
- **No nested folders**: flat file list, immediate `.md` files only.

## Testing instructions

No automated tests. Manual testing via `bun tauri dev`:

- First launch (no `localStorage.rootDir`): confirm iCloud folder is created/used.
- If iCloud unavailable: confirm folder picker opens.
- Create/edit/rename files; verify autosave and file list refresh.
- `Change Folder…` menu item triggers picker and updates `localStorage`.
- Theme/font/size changes via menubar.

## PR instructions

- **Title Format**: `[desktop] <Description>`
- **Before Committing**:
  - `bun run check` (types + lint)
  - `bun run build`
  - `bun run format`
