<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Portal Angular de citas FCV (datos sintéticos)

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c890a9e9-2809-4090-ad76-57a1ef731fc4

## Run locally

La imagen de producción se construye con `Dockerfile` y sirve la SPA mediante
Nginx. `API_URL` se inyecta en tiempo de arranque a
`assets/runtime-config.json`; no hay BFF ni URL de API fija en el bundle.

**Prerequisites:**  Node.js


1. `npm ci`
2. Ajusta `public/assets/runtime-config.json` para apuntar a `citas-api`.
3. `npm run dev`

La UI consume Spring Boot directamente, añade el access token por interceptor
y cubre registro, login, recuperación, perfil, búsqueda/reserva, citas y
cancelación. El backend sigue siendo la autoridad de disponibilidad y estados.

Verificación: `npm run lint` y `npm run build`.
