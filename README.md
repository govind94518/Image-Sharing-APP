# Image Sharing APP

A static Vite React + Redux prototype for OHIN imaging discovery. It simulates
SMART launch context, CDeX imaging searches, diagnostic reports, and controlled
viewer sessions without contacting clinical systems.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

Open the local URL printed by Vite after starting the development server.

## Prototype scope

- JavaScript React components under `src/`
- Redux Toolkit state for study filters and modal state
- RTK Query endpoints backed by a local mock CDeX adapter
- Patient context, modality/specialty/site filters, and external-source toggle
- Mock DiagnosticReport, thumbnail, and secure viewer-session flows
- Responsive desktop and mobile layouts

## Important

All data and sessions are mocked. The prototype does not implement production
SMART authorization, CDeX credentials, repository secrets, PHI safeguards, or
auditing. Those belong in the production proxy/security boundary.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: create the static GitHub Pages build in `dist/`
- `npm run preview`: preview the static production build locally
- `npm run lint`: run ESLint

## GitHub Pages

This app is configured for the repository:

```text
govind94518/Image-Sharing-APP
```

The GitHub Pages URL will be:

```text
https://govind94518.github.io/Image-Sharing-APP/
```

The Vite `base` path is set to `/Image-Sharing-APP/` in `vite.config.js`.
