import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { AuthenticatedUser, LoginResponse, Role, TokenResponse } from '../api/api.types';

export const SESSION_STORAGE_KEY = 'fcv.session';
/** Claves usadas por versiones anteriores; se eliminan al limpiar la sesión. */
const LEGACY_KEYS = ['fcv.access-token', 'fcv.refresh-token', 'fcv.reset-token'];
/** Máximo admitido por `setTimeout` (~24,8 días). */
const MAX_TIMEOUT_MS = 2_147_483_647;

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: AuthenticatedUser;
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const user = v['user'] as Record<string, unknown> | undefined;
  return (
    typeof v['accessToken'] === 'string' &&
    typeof v['refreshToken'] === 'string' &&
    typeof v['accessExpiresAt'] === 'string' &&
    typeof v['refreshExpiresAt'] === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    Array.isArray(user['roles'])
  );
}

/**
 * Estado de sesión con signals. Persiste en `sessionStorage`, se restaura al
 * recargar y descarta la sesión cuando el refresh token expira. Nunca registra
 * tokens.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore implements OnDestroy {
  private readonly state = signal<StoredSession | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryListener: (() => void) | null = null;

  readonly session = this.state.asReadonly();
  readonly user = computed(() => this.state()?.user ?? null);
  readonly roles = computed<readonly string[]>(() => this.state()?.user.roles ?? []);
  readonly isAuthenticated = computed(() => this.state() !== null);

  constructor() {
    this.restore();
  }

  accessToken(): string | null {
    return this.state()?.accessToken ?? null;
  }

  refreshToken(): string | null {
    return this.state()?.refreshToken ?? null;
  }

  hasAnyRole(roles: readonly (Role | string)[]): boolean {
    const own = this.roles();
    return roles.some((role) => own.includes(role));
  }

  /**
   * `true` si existe una sesión con refresh vigente. Si el refresh ya expiró,
   * limpia la sesión.
   */
  hasValidSession(now: number = Date.now()): boolean {
    const current = this.state();
    if (!current) return false;
    if (Date.parse(current.refreshExpiresAt) <= now) {
      this.clear();
      return false;
    }
    return true;
  }

  start(response: LoginResponse): void {
    this.write({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessExpiresAt: response.accessExpiresAt,
      refreshExpiresAt: response.refreshExpiresAt,
      user: response.user,
    });
  }

  /** Aplica el nuevo par de tokens de `/auth/refresh` conservando el usuario. */
  updateTokens(tokens: TokenResponse): void {
    const current = this.state();
    if (!current) return;
    this.write({
      ...current,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
    });
  }

  /** Refleja en la sesión cambios de perfil (p. ej. nombre tras `PATCH /me`). */
  updateUser(changes: Partial<Pick<AuthenticatedUser, 'firstName' | 'lastName'>>): void {
    const current = this.state();
    if (!current) return;
    this.write({ ...current, user: { ...current.user, ...changes } });
  }

  clear(): void {
    this.cancelExpiryTimer();
    this.state.set(null);
    const store = storage();
    if (!store) return;
    store.removeItem(SESSION_STORAGE_KEY);
    LEGACY_KEYS.forEach((key) => store.removeItem(key));
  }

  /** Callback invocado cuando el refresh expira con la aplicación abierta. */
  onExpired(listener: () => void): void {
    this.expiryListener = listener;
  }

  ngOnDestroy(): void {
    this.cancelExpiryTimer();
  }

  private write(session: StoredSession): void {
    this.state.set(session);
    storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.scheduleExpiry(session);
  }

  private restore(): void {
    const store = storage();
    const raw = store?.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredSession(parsed) && Date.parse(parsed.refreshExpiresAt) > Date.now()) {
        this.state.set(parsed);
        this.scheduleExpiry(parsed);
        return;
      }
    } catch {
      // Sesión corrupta: se descarta.
    }
    this.clear();
  }

  private scheduleExpiry(session: StoredSession): void {
    this.cancelExpiryTimer();
    const remaining = Date.parse(session.refreshExpiresAt) - Date.now();
    if (Number.isNaN(remaining)) return;
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      if (!this.hasValidSession()) this.expiryListener?.();
      else if (this.state()) this.scheduleExpiry(this.state() as StoredSession);
    }, Math.max(0, Math.min(remaining, MAX_TIMEOUT_MS)));
  }

  private cancelExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
