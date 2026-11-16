# Dealio client

Dealio is a React 19, TypeScript, and Vite single-page application. It includes Dashboard, Discover, My Products, product details, Compare, Notifications, Settings, and authentication flows. The visual system supports Light, Dark, and System themes, with English and Arabic language selection and document-level LTR/RTL direction.

## Local development

```powershell
cd client
npm ci
npm run dev
```

Vite proxies `/v1` requests to `http://localhost:5001`. Set `VITE_API_URL` only when the API is hosted at a different origin; keep it empty in local Compose so nginx routes API requests to the API service.

## Build

```powershell
npm run build
```

The production bundle is built into `dist/`. Full browser-based accessibility, responsive, and Arabic RTL review remains outstanding.

## Formatting

```powershell
npm run format
```

Formats client source files, public CSS/JavaScript, `index.html`, and the Vite config with Prettier.
