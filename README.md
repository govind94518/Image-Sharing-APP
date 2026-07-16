# Image Sharing App

A Vite React + Redux prototype for Image Sharing radiology discovery. The UI is
static, while the local SMART BFF owns confidential Oracle Health OAuth.

## Local development

Start the BFF first from:

```text
../image-sharing-smart-bff
```

Then run the UI:

```bash
npm install
npm run dev
```

The UI runs at `http://localhost:5173` and contacts the BFF at
`http://localhost:8084`. Override the BFF URL with `VITE_SMART_BFF_URL` in a
local `.env` file when needed.

## Run everything with Docker

Keep `image-sharing-ui` and `image-sharing-smart-bff` next to each other in the
same parent directory. Configure the BFF once:

```bash
cp ../image-sharing-smart-bff/.env.example ../image-sharing-smart-bff/.env
# Add the SMART client ID and secret to the ignored BFF .env file.
```

Then build and start both containers with one command from this directory:

```bash
docker compose up --build
```

Open `http://localhost:5173`. The BFF health endpoint is available at
`http://localhost:8084/health`. Stop both containers with:

```bash
docker compose down
```

Compose overrides the BFF's browser-facing settings for this local stack. The
SMART launch and redirect URLs remain `http://localhost:8084/launch` and
`http://localhost:8084/smart/callback`.

## SMART flow

1. Oracle Health launches the React UI with `iss` and `launch`.
2. The UI navigates to the BFF at `/smart/launch`.
3. The BFF discovers the EHR endpoints, creates PKCE state, and redirects the browser to Oracle Health.
4. Oracle Health redirects to the BFF callback, not to React.
5. The BFF exchanges the authorization code using its server-side client secret and sets an `HttpOnly` session cookie.
6. React calls `GET /api/session` with credentials and receives safe patient context only.

The browser never receives the client secret or OAuth access token.

## Oracle registration for local testing

```text
SMART Launch URI: http://localhost:8084/launch
Redirect URI:      http://localhost:8084/smart/callback
```

Both values must exactly match the Oracle Health application registration.

## Commands

- `npm run dev`: local Vite server
- `npm run build`: production static build in `dist/`
- `npm run preview`: local preview of the production build
- `npm run lint`: ESLint validation

## Deployment

The current GitHub Pages POC is available at:

```text
https://govind94518.github.io/Image-Sharing-APP/
```

The Pages workflow builds the UI with `VITE_SMART_BFF_URL=http://localhost:8084`.
This hybrid setup works only in a browser on the same computer where the BFF is
running. The confidential client secret remains in the ignored BFF `.env` and
is never included in the static UI. For shared or production use, deploy the BFF
over HTTPS and replace the build variable with that public BFF URL.
