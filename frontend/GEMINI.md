# Frontend Context

## Tech Stack

- **React 19** with **React Router v7**
- **Vite** for dev server and builds
- **Standard CSS** with CSS variables (no CSS-in-JS)
- **bun** for package management

## Structure

```
frontend/
├── app/
│   ├── components/    # Reusable UI & Context Providers
│   ├── pages/         # Route page components
│   ├── styles/        # CSS files (variables.css is the design system)
│   ├── utils/         # api.js, firebase config, helpers
│   ├── routes.ts      # Route definitions
│   └── root.jsx       # Root layout & providers
└── package.json
```

## Design System

CSS variables defined in `app/styles/variables.css`:

- **Colors**: Emerald primary (`--primary-*`), Slate neutrals (`--slate-*`)
- **Glass effects**: `--glass-bg`, `--glass-border`, `--blur-md`
- **Spacing**: Custom scale (`--space-1` through `--space-8`)
- **Safe areas**: Uses `env(safe-area-inset-*)` for mobile compatibility

## Key Patterns

### State Management
- `AuthProvider`: Firebase Auth state, exposes `user`, `loading`, `login()`, `logout()`
- `ThemeProvider`: Dark/light mode, sets `data-theme` attribute on `<html>`

### API Client (`utils/api.js`)
Automatically injects Firebase ID token into all requests via `auth.currentUser.getIdToken()`.

## JavaScript/React Style Guide

- Use **functional components** with hooks
- Use **named exports** for components
- Use **camelCase** for variables/functions, **PascalCase** for components
- Keep components focused; extract reusable logic into custom hooks
- Colocate component-specific styles in `app/styles/`
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Prefer `const` over `let`; avoid `var`

## Commands

```bash
bun run dev           # Start dev server (:5173)
bun run build         # Production build to build/client
bun add <package>     # Add dependency
```
