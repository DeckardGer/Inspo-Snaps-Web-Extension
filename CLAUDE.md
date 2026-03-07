# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspo Snaps is a browser extension for capturing and organizing images from web pages. Built with React + TypeScript, it supports both Chrome (Manifest v3) and Firefox (Manifest v2) with a backend API for storage.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript check + production build
```

**Code Quality (Biome):**
```bash
npx biome check src/     # Lint & format check
npx biome format src/    # Format files
```

No test framework is currently configured.

## Code Style

Configured via `biome.json`:
- Indentation: Tabs
- Quotes: Double quotes
- Recommended linting rules enabled
- Auto-organize imports

## Architecture

### Extension Structure

```
src/
├── background/     # Service worker (Chrome) / background script (Firefox)
├── content/        # Content script injected into web pages
│   └── toolbar/    # Main UI - Toolbar, FolderMenu, ImageSnapper, etc.
├── components/ui/  # shadcn/ui components (Radix + Tailwind)
├── hooks/          # Custom React hooks (useImageCapture, useToolbarDrag, etc.)
├── lib/            # Utilities and constants
├── services/       # Service layer (messaging to background services)
├── store/          # Zustand state management
└── types/          # TypeScript type definitions
```

### Key Patterns

**Messaging System**: Background and content scripts communicate via typed messages. Message types are defined in `src/types/messages.ts` with exhaustive type checking using TypeScript's `never` type in `src/background/messages.ts`.

**Shadow DOM**: Content script mounts React into a shadow DOM (`src/content/index.tsx`) for style isolation from host pages.

**Backend Services**: `src/background/services/` contains API service implementations for folders, images, and organizations. Content scripts communicate with these via the messaging layer in `src/services/`.

**State Management**: Three Zustand stores in `src/store/`:
- `toolbarStore` - UI state (minimized, corner position, inspector mode)
- `imagesStore` - Captured and flying images
- `foldersStore` - Folder tree structure

### Cross-Browser Support

The manifest (`src/manifest.json`) uses template syntax:
- `{{chrome}}` - Manifest v3 features
- `{{firefox}}` - Manifest v2 features

### Path Aliases

`@/` maps to `src/` - use for all imports.

## Key Technologies

- React 18 + TypeScript 5.6
- Zustand for state
- Tailwind CSS 4 + shadcn/ui (new-york style)
- Vite + vite-plugin-web-extension
- webextension-polyfill for cross-browser APIs
