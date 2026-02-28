# Superscript

A minimal, distraction-free markdown notes app for macOS built with Tauri v2, React, and ProseMirror.

![Superscript](.github/screenshot.png)

## Download

Download the latest release from the [releases page](https://github.com/usamaasfar/superscript/releases/latest).

- **Apple Silicon** — download the `aarch64.dmg`
- **Intel** — download the `x64.dmg`

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Cmd+K | Open / close command bar |
| Cmd+N | New page |
| Cmd+Delete | Delete current page |
| Cmd+F | Toggle fullscreen |
| Escape | Close command bar |

## User guide

### Create a new page

Press **Cmd+N** or choose **File → New Page** from the menu bar. A blank writing surface appears immediately. The file is saved automatically and named from the first line you type.

### Delete a page

Open the page you want to remove, then press **Cmd+Delete** or choose **File → Delete Page** from the menu bar. The page is permanently removed and the next available note opens automatically.

### Search and switch pages

Press **Cmd+K** to open the command bar. Start typing any part of a note's title to filter the list, then press **Enter** or click a result to open it. Press **Escape** or **Cmd+K** again to dismiss it without switching.

## Development

### Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://www.rust-lang.org/tools/install)
- Xcode Command Line Tools (`xcode-select --install`)

### Install dependencies

```bash
bun install
```

### Run in dev mode

```bash
cd apps/desktop
bun tauri dev
```

### Build

```bash
cd apps/desktop
bun tauri build
```

## License

MIT
