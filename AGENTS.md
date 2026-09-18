# Guía para `citas-web`

## Estado verificado del repositorio

El repositorio aún no tiene `package.json`, configuración de React o Angular,
`src/`, rutas, estilos/tokens ni artefactos de diseño aprobado. Por ello el
stack no está decidido y no se debe crear, migrar ni preferir un framework por
iniciativa propia. Después de importar la exportación de Google AI Studio,
inspeccionar de nuevo el proyecto y depurar este archivo con evidencia real.

Tampoco hay HU, criterios de aceptación ni DoD en el repositorio. Antes de
implementar una funcionalidad, localizar la especificación aprobada en
`citas-api/docs/wiki/scrum/` o solicitarla al orquestador.

## Alcance de este repositorio

Implementar exclusivamente el frontend TypeScript que resulte de Stitch y
Google AI Studio: UI, rutas, formularios, estados de interfaz, accesibilidad,
cliente REST, manejo de errores, build y pruebas.

No editar `citas-api`, no añadir Express/BFF y no implementar reglas de
negocio como autoridad del cliente. El frontend consume Spring Boot
directamente por REST; si falta o cambia un contrato, reportarlo al
orquestador para coordinación cross-repo.

La LLM Wiki bajo `citas-api/docs/wiki/llm-wiki/` es global y la mantiene el
orquestador. Este agente puede consultarla, pero no la mantiene ni crea una
wiki propia.

## Diseño y experiencia

- El diseño aprobado de Stitch/AI Studio es la fuente de verdad visual.
- Antes de reconciliar código generado, identificar sus rutas, componentes,
  estilos, tokens, assets y comportamiento existente.
- Preservar componentes y estilos correctos; no rediseñar pantallas aprobadas
  para resolver una integración técnica.
- Para cada cambio, mapear explícitamente estados `loading`, `empty`, `error`,
  `success` y controles `disabled` cuando apliquen.
- Mantener etiquetas, foco, navegación por teclado, mensajes de error y
  semántica accesible.

## Integración y seguridad

- Configurar la URL de API mediante el mecanismo de environment propio del
  framework detectado; no hardcodearla.
- No hardcodear JWT, refresh tokens, secretos ni credenciales, y no abrir ni
  versionar `.env`.
- Tratar la autorización de rutas y los roles como experiencia de UI; el
  backend conserva la autoridad de autorización y reglas de negocio.
- Mostrar errores del contrato de forma segura y usable, sin exponer datos
  sensibles.

## Flujo por incremento

1. Leer la HU, CA y DoD aprobados.
2. Identificar pantallas, rutas, componentes, servicios y estados afectados.
3. Confirmar contrato REST disponible; elevar al orquestador cualquier cambio
   requerido en API antes de editar ambos repositorios.
4. Presentar un plan con archivos, estados de UI y evidencia esperada.
5. Implementar el mínimo coherente sin desviar el diseño aprobado.
6. Ejecutar build, typecheck y pruebas disponibles tras descubrir los scripts
   reales en `package.json`; no inventar comandos mientras no exista.
7. Verificar criterios de aceptación y resumir evidencia y elementos no
   verificados.

## Git

Usar `develop` para trabajo y reservar `main` para incrementos estables. Si la
rama no existe, informarlo antes de crearla. No reescribir historial para borrar
progreso.
