# Superscript

A minimal markdown editor for macOS, built with Tauri 2 + React + ProseMirror.

## What it is

Superscript is a distraction-free writing app. You point it at a folder of `.md` files and it gets out of the way. No sidebars, no tabs, no sync — just a clean editor that reads and writes plain markdown files on disk.

## Stack

- **Shell**: Tauri 2 (Rust) — native macOS window, menubar, file system access
- **UI**: React 19 + TypeScript, bundled with Vite
- **Editor**: ProseMirror with a custom markdown schema (parse + serialize)
- **Styling**: Plain CSS with `--bg`, `--fg`, `--font`, `--font-size` CSS variables
- **Monorepo**: Turborepo + Bun workspaces

## Key behaviours

- On first launch, prompts for a folder. Remembers it in `localStorage`.
- Lists `.md` files from that folder. Cmd+K opens a file switcher (cmdk).
- Files are named by datetime stamp (e.g. `2026-02-21 14.32.md`).
- Autosaves 800ms after the last keystroke via `writeTextFile`.
- Light/dark/system theme, font, and font size are persisted in `localStorage` and controllable from the menubar.

## Project layout

```
apps/desktop/
  src/                  React frontend
    editor/             ProseMirror editor + markdown serializer
    App.tsx             Root component — folder, file state, autosave
    CommandBar.tsx      Cmd+K file switcher (cmdk)
  src-tauri/
    src/lib.rs          Tauri builder, menu, event emissions
    capabilities/       Tauri ACL permissions
```

## Running

```bash
bun tauri dev       # dev server + native window
bun tauri build     # production build
```
