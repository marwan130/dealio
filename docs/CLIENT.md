# Client

The client is a React 19 and TypeScript single-page application built with Vite. Its main entry is `src/App.tsx`; design tokens and responsive components live in the stylesheets in `public/` (`dealio-app-web.css`, `dealio-app-web-b.css`, `dealio-guest-panel.css`), loaded by `index.html`.

## Current screens and flows

- Dashboard with API-backed tracking counts and recent trackings.
- Discover with product search, URL preview, filters, and offer confirmation/tracking.
- My Products with searchable category/market/price/status facets, table/card views, compare selection, bulk actions, and pause/resume controls.
- Product details with offer and price-history views, per-offer monitoring exclusions, and editable target/email preferences for saved trackings.
- Compare for up to three locally persisted product selections.
- Notifications with event types and read/unread state.
- Settings with selectable Account, Appearance, Markets and Currency, Notifications, and Search and Tracking panels; includes locale direction, independent market and display currency, global tracking pause/resume, complete and filterable JSON/CSV account export, and grace-period deletion/cancellation.
- Sign in/register dialog and email verification, forgot-password, and reset-password routes.
- Product imagery uses validated HTTP(S) source URLs directly in the browser. Image frames are white and use `object-fit: contain`, with no background-removal or image-processing service.

The API URL is `VITE_API_URL`; leave it empty in local Compose so nginx proxies `/v1/` to the API. For the separate Vite development server, set `VITE_API_URL=http://localhost:5001` in `client/.env.local`.

## Development

```powershell
npm --prefix client ci
npm --prefix client run dev
npm --prefix client run build
```
