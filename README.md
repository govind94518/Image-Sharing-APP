# Image Sharing App

A static Vite React + Redux prototype for OHIN imaging discovery. It implements
Oracle Health SMART on FHIR authorization and uses the authenticated Patient,
Encounter, practitioner, and FHIR server context. Imaging results, reports, and
viewer sessions remain mocked for the POC.

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
- Oracle Health EHR launch using `iss` and `launch`
- OAuth callback processing through `FHIR.oauth2.ready()`
- Provider launch scopes for Patient, Encounter, DiagnosticReport, ServiceRequest, and Binary resources
- Mock DiagnosticReport, thumbnail, and secure viewer-session flows
- Responsive desktop and mobile layouts

## Important

SMART authorization and patient context are real when the app is launched from
the Oracle Health sandbox. Imaging records and viewer sessions are mocked. CDeX
credentials, repository secrets, PHI safeguards, and auditing still belong in
the production proxy/security boundary.

The registered Oracle Health redirect and launch URI is:

```text
https://govind94518.github.io/Image-Sharing-APP/index.html
```

The production client ID defaults to the public client registered for this app.
It can be overridden at build time with `VITE_SMART_CLIENT_ID`.
The complete requested scope can be overridden with `VITE_SMART_SCOPE` when an
EHR registration uses a provider-specific scope set.
The redirect URI can be overridden with `VITE_SMART_REDIRECT_URI`; otherwise the
app preserves the path used by the SMART launcher, including `index.html`.

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
The build also creates static fallbacks for `/launch` and unknown GitHub Pages
routes so SMART launch query parameters are preserved when the launcher uses a
route instead of `index.html`.
