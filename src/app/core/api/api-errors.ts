import { HttpErrorResponse } from '@angular/common/http';
import { FieldError, ProblemDetails } from './api.types';

export const NETWORK_ERROR = 'NETWORK_ERROR';
export const SERVER_ERROR = 'SERVER_ERROR';
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

/** Mensajes seguros en español por `code` estable del backend. */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo electrónico o contraseña incorrectos. Por favor verifica tus datos.',
  IDENTIFIER_ALREADY_REGISTERED: 'Ya existe una cuenta registrada con el correo electrónico o el documento ingresado.',
  EMAIL_ALREADY_REGISTERED: 'Ya existe una cuenta registrada con este correo electrónico.',
  DOCUMENT_ALREADY_REGISTERED: 'Ya existe una cuenta registrada con este número de documento.',
  VALIDATION_ERROR: 'Algunos datos no son válidos. Revisa los campos marcados e inténtalo nuevamente.',
  INVALID_REQUEST: 'La solicitud no es válida. Revisa los datos e inténtalo nuevamente.',
  INVALID_RESET_TOKEN: 'El enlace de recuperación no es válido, ya fue usado o expiró. Solicita uno nuevo para continuar.',
  INVALID_REFRESH_TOKEN: 'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
  UNAUTHORIZED: 'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
  FORBIDDEN: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no existe o ya no está disponible.',
  INTEGRITY_ERROR: 'La operación entra en conflicto con información existente.',
  SLOT_UNAVAILABLE: 'El horario seleccionado ya no está disponible. Elige otro horario.',
  DUPLICATE_CODE: 'Ya existe un registro con ese código. Usa un código diferente.',
  GENERAL_SPECIALTY_CONFLICT: 'Ya existe una especialidad general activa. Desactívala antes de activar otra.',
  CATALOG_INACTIVE: 'La opción seleccionada ya no está activa. Elige otra opción vigente.',
  DUPLICATE_EMAIL: 'Ya existe una cuenta con este correo electrónico.',
  DUPLICATE_DOCUMENT: 'Ya existe una cuenta con este número de documento.',
  DUPLICATE_PROFESSIONAL_CODE: 'Ya existe un profesional con este código.',
  DUPLICATE_LICENSE: 'Ya existe un profesional con este número de registro médico.',
  PRIMARY_NOT_ASSIGNED: 'La especialidad principal debe estar entre las especialidades asignadas.',
  PAST_BLOCK: 'El bloque ya inició o pertenece al pasado; no puede crearse ni modificarse.',
  BLOCK_OVERLAP: 'El horario se cruza con otro bloque activo tuyo (en cualquier sede).',
  OVERLAPPING_BLOCK: 'El horario se cruza con otro bloque activo tuyo (en cualquier sede).',
  BLOCK_COMMITTED: 'El bloque tiene citas reservadas o retenidas; no puede modificarse ni eliminarse.',
  COMMITTED_BLOCK: 'El bloque tiene citas reservadas o retenidas; no puede modificarse ni eliminarse.',
  LOCATION_NOT_ASSIGNED: 'No tienes asignada esa sede. Elige una de tus sedes activas.',
  PROFESSIONAL_INACTIVE: 'Tu perfil profesional está inactivo; no puedes publicar bloques.',
  PROFESSIONAL_REQUIRED: 'Se requiere un perfil profesional activo para esta acción.',
  INVALID_BLOCK_TIME: 'Las horas deben estar en :00 o :30 y la hora final debe ser posterior a la inicial.',
  INVALID_DATETIME: 'La fecha u hora no es válida.',
  [NETWORK_ERROR]: 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
  [SERVER_ERROR]: 'Ocurrió un error inesperado en el servidor. Inténtalo nuevamente en unos minutos.',
  [UNKNOWN_ERROR]: 'No fue posible completar la solicitud. Inténtalo nuevamente.',
};

const STATUS_FALLBACK: Record<number, string> = {
  400: 'INVALID_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Extrae Problem Details de un error HTTP, si el cuerpo lo contiene. */
export function toProblem(error: unknown): ProblemDetails | null {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) return null;
  const body = error.error;
  const errors = Array.isArray(body['errors'])
    ? (body['errors'] as unknown[]).filter(
        (item): item is FieldError => isRecord(item) && typeof item['field'] === 'string',
      )
    : undefined;
  return {
    type: typeof body['type'] === 'string' ? body['type'] : undefined,
    title: typeof body['title'] === 'string' ? body['title'] : undefined,
    status: typeof body['status'] === 'number' ? body['status'] : error.status,
    detail: typeof body['detail'] === 'string' ? body['detail'] : undefined,
    code: typeof body['code'] === 'string' ? body['code'] : undefined,
    errors,
  };
}

/** Devuelve el `code` del backend o uno sintético según el estado HTTP. */
export function errorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return UNKNOWN_ERROR;
  if (error.status === 0) return NETWORK_ERROR;
  const code = toProblem(error)?.code;
  if (code) return code;
  if (error.status >= 500) return SERVER_ERROR;
  return STATUS_FALLBACK[error.status] ?? UNKNOWN_ERROR;
}

/** Mensaje en español seguro para mostrar al usuario. Nunca expone el detalle técnico. */
export function errorMessage(error: unknown, fallback?: string): string {
  const code = errorCode(error);
  return MESSAGES[code] ?? fallback ?? (error instanceof HttpErrorResponse && error.status >= 500
    ? MESSAGES[SERVER_ERROR]
    : MESSAGES[UNKNOWN_ERROR]);
}

/** Errores por campo de un `VALIDATION_ERROR` (nombres de campo del DTO). */
export function fieldErrors(error: unknown): string[] {
  return (toProblem(error)?.errors ?? []).map((item) => item.field);
}
