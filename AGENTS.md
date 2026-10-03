# `citas-web` — instrucciones del agente frontend

## Estado comprobado del repositorio

Verificado el 2026-10-02 en la rama `develop`:

- **Stack:** Angular 21 standalone (signals, `ChangeDetectionStrategy.OnPush`,
  zoneless), Tailwind CSS 4 vía PostCSS, TypeScript 5.9, Node 24 / npm 11.
- **Scripts:** `npm run dev` (`ng serve` en el puerto 5173), `npm run lint`
  (`ng lint`, angular-eslint con reglas de accesibilidad de plantillas),
  `npm test` / `npx ng test --watch=false` (Vitest + jsdom con TestBed y
  `HttpTestingController`) y `npm run build` (salida en `dist/app/browser`).
- **Configuración de ejecución:** `assets/runtime-config.json` (`{ "apiUrl": ... }`)
  se carga una sola vez al arrancar (`provideAppInitializer` en
  `src/app/core/config/app-config.service.ts`). En Docker se genera desde la
  variable `API_URL`; el bundle no contiene URL de API fija.
- **Rutas:** `src/app/app.routes.ts` con carga diferida: `/login`, `/registro`,
  `/recuperar`, `/restablecer?token=`, `/inicio`, `/reservar`, `/mis-citas`,
  `/perfil`, `/operacion`, `/no-autorizado`; comodín a `/` (inicio del rol o login).
- **Sesión y seguridad UI:** `src/app/core/auth/` contiene `SessionStore`
  (signals + `sessionStorage`, consciente de expiración), `AuthService`
  (login, registro, refresh single-flight, logout, recuperación),
  `authInterceptor` (Bearer hacia la API salvo `/api/v1/auth/**`; ante `401`
  renueva una vez y reintenta; si falla vuelve a `/login?aviso=sesion-expirada`;
  ante `403` muestra `/no-autorizado`) y los guards `authGuard`, `roleGuard`
  (`data.roles`: USER, PROFESSIONAL, ADMIN) y `guestGuard`. El filtrado de menú
  por rol es solo UX: el backend conserva la autorización.
- **Errores:** DTOs tipados en `src/app/core/api/api.types.ts` y mapeo de
  Problem Details `code` → mensaje en español en `src/app/core/api/api-errors.ts`.
- **Diseño:** el aspecto exportado de Stitch/AI Studio (tokens en
  `src/styles.css`, plantillas de `src/app/components/`) es la referencia
  visual. Los ZIP `portal-de-citas*.zip` de la raíz son exportaciones
  originales del prototipo.
- **Pantallas con datos reales:** todas las pantallas consumen la API (HU-001 a
  HU-025); no quedan datos simulados. Las imágenes institucionales están en
  `src/app/services/brand-assets.ts`. Los clientes REST por área viven en
  `src/app/core/api/` y los fixtures sintéticos de prueba en `src/app/testing/`.

## Responsabilidad exclusiva

Este repositorio contiene únicamente la interfaz TypeScript: pantallas, componentes, formularios, estado de UI, accesibilidad, autorización de rutas, cliente REST, manejo de errores y pruebas/build del stack importado. No editar `../citas-api`.

La UI consume `citas-api` directamente por REST. No añadir Express, BFF ni lógica de negocio que sustituya la autoridad del backend.

## Fidelidad de diseño

- Stitch/AI Studio aprobado es la fuente de verdad visual.
- Preservar componentes, estilos y tokens correctos durante la reconciliación del código generado.
- No rediseñar pantallas por preferencia técnica o estética.
- Si no existe evidencia del diseño aprobado, identificarlo como bloqueo antes de una reconciliación visual; no inventar esa referencia.

## Flujo por historia de usuario

1. Localizar la HU aprobada, criterios de aceptación y DoD. Si no existen, detener la implementación y solicitar o seguir el flujo autorizado de especificación.
2. Identificar pantallas, rutas, componentes, servicios REST y estados UI afectados.
3. Mapear explícitamente loading, empty, error, success y disabled, además de estados de acceso no autorizado cuando correspondan.
4. Implementar el cambio mínimo sin alterar el diseño aprobado ni trasladar reglas de negocio al cliente.
5. Ejecutar los scripts reales de build, typecheck y pruebas disponibles en el proyecto importado.
6. Verificar comportamiento contra criterios de aceptación y resumir evidencia y aspectos no verificados.

## API, seguridad y coordinación

- La URL de API se obtiene de `assets/runtime-config.json` mediante `AppConfigService` (generado desde `API_URL` en Docker); no hardcodearla ni volver a leer el archivo en cada servicio.
- No hardcodear tokens, secretos ni credenciales; no registrarlos en consola.
- Tratar validaciones, disponibilidad, transiciones de cita, autorización y ownership como decisiones finales del backend. El cliente puede mejorar la experiencia, pero no sustituye la validación server-side.
- Si falta o cambia un contrato REST, reportarlo al orquestador con el endpoint, payload, respuesta/error esperado, pantallas afectadas y evidencia requerida. No editar `../citas-api`.
- No mantener una LLM Wiki propia; la memoria global está en `citas-api/docs/wiki/llm-wiki/` bajo responsabilidad del orquestador.

## Git

`main` es estable y `develop` es la rama de trabajo definida por el workspace; ambas existen. No crear ni cambiar ramas como efecto incidental de una tarea. Preservar cambios no relacionados y no reescribir historial. Antes de cada commit deben pasar `npm run lint`, `npx ng test --watch=false` y `npm run build`.
