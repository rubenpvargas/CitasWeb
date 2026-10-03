/**
 * DTOs del contrato REST de `citas-api` (ver
 * `citas-api/docs/wiki/llm-wiki/wiki/contratos-rest.md`). Las fechas `Instant`
 * llegan como cadenas ISO-8601.
 */

export const ROLES = ['USER', 'PROFESSIONAL', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** `AuthenticatedUserResponse` */
export interface AuthenticatedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

/** `TokenResponse` (respuesta de `/auth/refresh`). */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

/** `LoginResponse` (respuesta de `/auth/login`). */
export interface LoginResponse extends TokenResponse {
  user: AuthenticatedUser;
}

/** `LoginRequest` */
export interface LoginRequest {
  email: string;
  password: string;
}

/** `RefreshRequest` (también usado por `/auth/logout`). */
export interface RefreshRequest {
  refreshToken: string;
}

/** `RegisterRequest` */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
}

/** `RegisteredUserResponse` */
export interface RegisteredUserResponse {
  id: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  roles: string[];
}

/** `PasswordResetRequest` */
export interface PasswordResetRequest {
  email: string;
}

/** `PasswordResetResponse`: `developmentToken` solo existe en desarrollo. */
export interface PasswordResetResponse {
  message: string;
  developmentToken?: string | null;
}

/** `PasswordResetConfirmRequest` */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface FieldError {
  field: string;
  message: string;
}

/** RFC 7807 Problem Details con `code` estable. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: FieldError[];
}
