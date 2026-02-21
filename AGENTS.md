# AGENTS.md

## Setup commands

- **Install dependencies**:
  ```bash
  bun install
  ```

- **Start development server**:
  ```bash
  bun tauri dev
  ```
  This command starts the Vite dev server and the Tauri application window.

- **Build for production**:
  ```bash
  bun tauri build
  ```

## Code style

- **Framework**: React 19 + TypeScript.
- **Styling**: Plain CSS with CSS variables (`--bg`, `--fg`, etc.) and Tailwind CSS v4.
- **Linting & Formatting**: Biome.
  - Run lint: `bun run lint`
  - Format: `bun run format`
  - Check types and lint: `bun run check`
- **Conventions**:
  - Functional components with hooks.
  - Strict TypeScript types.
  - Double quotes for strings (enforced by Biome).
  - Imports organized by Biome.

## Dev environment tips

- **Project Structure**:
  - `apps/desktop`: Main Tauri application.
    - `src/`: React frontend.
      - `editor/`: ProseMirror editor implementation.
    - `src-tauri/`: Rust backend.
- **Key Behaviors**:
  - Prompts for a folder on first launch (persisted in `localStorage`).
  - Autosaves 800ms after last keystroke.
  - Cmd+K opens file switcher.
- **Tips**:
  - Use `bun run <script>` to execute scripts.
  - Check `apps/desktop/src/App.tsx` for main application logic.

## Testing instructions

- **Manual Testing**:
  - Currently, there are no automated tests set up for `apps/desktop`.
  - Verify functionality by running `bun tauri dev`:
    - Check file listing from the selected folder.
    - Create new files (Cmd+N).
    - Edit files and verify autosave.
    - Switch files using Cmd+K.
    - Change themes via menubar.

## PR instructions

- **Title Format**: `[desktop] <Description>`
- **Before Committing**:
  - Run `bun run check` to verify types and linting.
  - Ensure the application builds successfully with `bun run build`.
  - Format code with `bun run format`.
