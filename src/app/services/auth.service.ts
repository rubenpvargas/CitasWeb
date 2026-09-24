import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string) {
    return this.http.get<RuntimeConfig>('assets/runtime-config.json').pipe(
      switchMap(({ apiUrl }) => this.http.post<LoginResponse>(`${apiUrl}/api/v1/auth/login`, { email, password })),
      map((tokens) => {
        sessionStorage.setItem('fcv.access-token', tokens.accessToken);
        sessionStorage.setItem('fcv.refresh-token', tokens.refreshToken);
        return tokens.user;
      }),
      catchError((error) => throwError(() => error)),
    );
  }
}
