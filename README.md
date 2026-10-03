# citas-web — Portal Angular de citas HIC | FCV (datos sintéticos)

SPA Angular 21 (standalone, signals, Tailwind CSS 4) del laboratorio de
agendamiento de citas. Consume directamente la API REST Spring Boot de
`citas-api`: no hay Express ni BFF. Todos los datos son sintéticos.

## Requisitos

- Node.js 24 LTS y npm 11.
- Una instancia de `citas-api` accesible (por defecto `http://localhost:8080`).

## Uso local

1. `npm ci`
2. Ajusta `public/assets/runtime-config.json` si la API no está en
   `http://localhost:8080`:

   ```json
   { "apiUrl": "http://localhost:8080" }
   ```

3. `npm run dev` y abre `http://localhost:5173`.

La configuración de ejecución se carga una sola vez al arrancar la aplicación;
el bundle no contiene ninguna URL de API fija.

## Verificación

| Comando | Qué hace |
|---|---|
| `npm run lint` | angular-eslint (TypeScript y plantillas, incluidas reglas de accesibilidad) |
| `npx ng test --watch=false` | Pruebas unitarias con Vitest + jsdom (`npm test` las ejecuta en modo watch) |
| `npm run build` | Build de producción en `dist/app/browser` |

## Docker

`Dockerfile` construye la SPA y la sirve con Nginx (con fallback a
`index.html` para las rutas del router). Al arrancar el contenedor,
`docker/entrypoint.sh` genera `assets/runtime-config.json` a partir de la
variable `API_URL`:

```sh
docker build -t citas-web .
docker run -p 8081:80 -e API_URL=http://localhost:8080 citas-web
```

El origen del frontend debe estar permitido en la configuración CORS de
`citas-api`.

## Rutas y sesión

- Públicas: `/login`, `/registro`, `/recuperar`, `/restablecer?token=…`.
- USER: `/inicio`, `/reservar`, `/mis-citas`; ADMIN/PROFESSIONAL: `/operacion`;
  cualquier sesión: `/perfil`.
- La sesión (tokens y usuario de la respuesta de login) vive en
  `sessionStorage`. El interceptor añade el access token, renueva una sola vez
  ante `401` y, si la renovación falla, vuelve a `/login`. Los guards y el menú
  por rol son solo experiencia de usuario: la autorización final es del backend.

Todas las pantallas (inicio, reserva, mis citas, perfil y operación ADMIN /
PROFESSIONAL) consumen la API real; no quedan datos simulados en el bundle.
