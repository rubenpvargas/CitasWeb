import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, switchMap, throwError } from 'rxjs';

interface RuntimeConfig {
  apiUrl: string;
}

export interface AuthenticatedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: AuthenticatedUser;
}

export interface PasswordResetResponse { message: string; developmentToken?: string | null; }

export interface RegisterUserRequest {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisteredUser {
  id: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<AuthenticatedUser | null>(null);

  login(email: string, password: string) {
    return this.http.get<RuntimeConfig>('assets/runtime-config.json').pipe(
      switchMap(({ apiUrl }) => this.http.post<LoginResponse>(`${apiUrl}/api/v1/auth/login`, { email, password })),
      map((tokens) => {
        sessionStorage.setItem('fcv.access-token', tokens.accessToken);
        sessionStorage.setItem('fcv.refresh-token', tokens.refreshToken);
        this.currentUser.set(tokens.user);
        return tokens.user;
      }),
      catchError((error) => throwError(() => error)),
    );
  }

  register(request: RegisterUserRequest) {
    return this.http.get<RuntimeConfig>('assets/runtime-config.json').pipe(
      switchMap(({ apiUrl }) =>
        this.http.post<RegisteredUser>(`${apiUrl}/api/v1/auth/register`, request),
      ),
      catchError((error) => throwError(() => error)),
    );
  }

  requestPasswordReset(email: string) {
    return this.http.get<RuntimeConfig>('assets/runtime-config.json').pipe(
      switchMap(({ apiUrl }) => this.http.post<PasswordResetResponse>(`${apiUrl}/api/v1/auth/password-reset/request`, { email })),
    );
  }

  confirmPasswordReset(token: string, newPassword: string) {
    return this.http.get<RuntimeConfig>('assets/runtime-config.json').pipe(
      switchMap(({ apiUrl }) => this.http.post<void>(`${apiUrl}/api/v1/auth/password-reset/confirm`, { token, newPassword })),
    );
  }

  logout() {
    const refreshToken = sessionStorage.getItem('fcv.refresh-token');
    sessionStorage.removeItem('fcv.access-token');
    sessionStorage.removeItem('fcv.refresh-token');
    this.currentUser.set(null);
    if (!refreshToken) return;
    this.http.get<RuntimeConfig>('assets/runtime-config.json').pipe(
      switchMap(({ apiUrl }) => this.http.post<void>(`${apiUrl}/api/v1/auth/logout`, { refreshToken })),
    ).subscribe({ error: () => undefined });
  }
}
