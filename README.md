# InspoSnaps browser extension

> **This project is retired.** insposnaps.com has been shut down, so this extension no longer has a backend to talk to, and the code is no longer maintained. It's open sourced as-is in case it's useful to anyone.
>
> InspoSnaps never got any users, and [Stashr](https://stashr.me) ended up being the same idea done much better. If you're looking for a place to save and organise inspiration, use that instead.

The browser extension for InspoSnaps. It added a draggable toolbar to any web page so you could snap images straight into your InspoSnaps folders. The web app it connected to lives at [Inspo-Snaps-Website](https://github.com/DeckardGer/Inspo-Snaps-Website).

## Features

- Floating, draggable toolbar on every page, with keyboard shortcuts
- Click any image on a page to capture it, or right-click → **Save Image**, with a preview before saving
- Save into personal or team folders, with folder search and navigation
- Signs in with your InspoSnaps account (Better Auth), shared with the website
- Works in Chrome (Manifest V3) and Firefox (Manifest V2)

## Tech stack

- React 18 + TypeScript, built with Vite and `vite-plugin-web-extension`
- Zustand for state
- Tailwind CSS v4 and shadcn/ui
- Biome for linting and formatting

## Running it locally

The extension expects the [website](https://github.com/DeckardGer/Inspo-Snaps-Website) running at `http://localhost:3000` in development (see `src/lib/config.ts`).

```bash
npm install
npm run dev     # opens a browser with the extension loaded, with hot reload
npm run build   # production build into dist/
```

To install a production build, load the `dist/` folder as an unpacked extension.

## Code layout

```
src/
├── background/   # Service worker: auth, sessions, API calls
├── content/      # Content script and the on-page toolbar UI
├── hooks/        # Capture, drag, hotkeys and sync hooks
├── services/     # Messaging from the page to the background script
├── store/        # Zustand stores
└── manifest.json # Shared Chrome/Firefox manifest
```

## License

[MIT](LICENSE)
