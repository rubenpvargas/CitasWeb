import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import {
  AuthenticatedUser,
  LoginResponse,
  PasswordResetResponse,
  RegisterRequest,
  RegisteredUserResponse,
  TokenResponse,
} from '../api/api.types';
import { SessionStore } from './session.store';
import { LOGIN_NOTICE_PARAM, LoginNotice } from './login-notice';

export const AUTH_PATHS = {
  login: '/api/v1/auth/login',
  register: '/api/v1/auth/register',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
  passwordResetRequest: '/api/v1/auth/password-reset/request',
  passwordResetConfirm: '/api/v1/auth/password-reset/confirm',
} as const;

export class NoRefreshTokenError extends Error {
  constructor() {
    super('No hay refresh token disponible.');
  }
}

/** Cliente REST de identidad (HU-001 a HU-004) y ciclo de vida de la sesión. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private refreshInFlight$: Observable<TokenResponse> | null = null;

  readonly currentUser = this.session.user;
  readonly isAuthenticated = this.session.isAuthenticated;

  constructor() {
    this.session.onExpired(() => this.expireSession());
  }

  login(email: string, password: string): Observable<AuthenticatedUser> {
    return this.http
      .post<LoginResponse>(this.config.url(AUTH_PATHS.login), { email, password })
      .pipe(
        tap((response) => this.session.start(response)),
        map((response) => response.user),
      );
  }

  register(request: RegisterRequest): Observable<RegisteredUserResponse> {
    return this.http.post<RegisteredUserResponse>(this.config.url(AUTH_PATHS.register), request);
  }

  /**
   * Renueva el par de tokens. Peticiones concurrentes comparten una única
   * llamada a `/auth/refresh` (single-flight).
   */
  refreshSession(): Observable<TokenResponse> {
    if (this.refreshInFlight$) return this.refreshInFlight$;
    const refreshToken = this.session.refreshToken();
    if (!refreshToken) return throwError(() => new NoRefreshTokenError());
    this.refreshInFlight$ = this.http
      .post<TokenResponse>(this.config.url(AUTH_PATHS.refresh), { refreshToken })
      .pipe(
        tap((tokens) => this.session.updateTokens(tokens)),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight$;
  }

  /**
   * Revoca el refresh en la API y limpia la sesión local aunque la API falle.
   * Nunca emite error.
   */
  logout(): Observable<void> {
    const refreshToken = this.session.refreshToken();
    if (!refreshToken) {
      this.session.clear();
      return of(undefined);
    }
    return this.http.post<void>(this.config.url(AUTH_PATHS.logout), { refreshToken }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => this.session.clear()),
    );
  }

  /** Limpia la sesión y vuelve a login con el aviso de sesión expirada. */
  expireSession(): void {
    const hadSession = this.session.isAuthenticated();
    this.session.clear();
    if (hadSession) {
      void this.router.navigate(['/login'], {
        queryParams: { [LOGIN_NOTICE_PARAM]: 'sesion-expirada' satisfies LoginNotice },
      });
    }
  }

  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(this.config.url(AUTH_PATHS.passwordResetRequest), { email });
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>(this.config.url(AUTH_PATHS.passwordResetConfirm), { token, newPassword })
      .pipe(map(() => undefined));
  }
}
