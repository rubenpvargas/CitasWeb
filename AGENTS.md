# `citas-web` — instrucciones del agente frontend

## Estado comprobado del repositorio

Al 2026-09-17 este repositorio no contiene `package.json`, código TypeScript, configuración React/Angular, rutas, estilos/tokens, pruebas ni documentación de un diseño Stitch/AI Studio aprobado. No hay HU, criterios de aceptación ni DoD disponibles en este repositorio.

No elegir React ni Angular hasta que el estudiante importe el proyecto generado por Google AI Studio. Tras esa importación, inspeccionar primero `package.json`, configuración, estructura de `src`, enrutamiento, estilos/tokens, scripts y la documentación/artefactos del diseño aprobado antes de proponer cambios.

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

- La URL de API debe obtenerse de la configuración de environment propia del stack detectado; no hardcodearla.
- No hardcodear tokens, secretos ni credenciales; no registrarlos en consola.
- Tratar validaciones, disponibilidad, transiciones de cita, autorización y ownership como decisiones finales del backend. El cliente puede mejorar la experiencia, pero no sustituye la validación server-side.
- Si falta o cambia un contrato REST, reportarlo al orquestador con el endpoint, payload, respuesta/error esperado, pantallas afectadas y evidencia requerida. No editar `../citas-api`.
- No mantener una LLM Wiki propia; la memoria global está en `citas-api/docs/wiki/llm-wiki/` bajo responsabilidad del orquestador.

## Git

`main` es estable y `develop` es la rama de trabajo definida por el workspace. Actualmente solo existe `main`; no crear ni cambiar ramas como efecto incidental de una tarea de documentación. Preservar cambios no relacionados y no reescribir historial.
