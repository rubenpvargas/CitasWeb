import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

/**
 * Los endpoints de `/api/v1/auth/` son públicos (login, register, refresh,
 * logout, password-reset): no llevan Bearer ni disparan renovación. El logout
 * se autentica con el refresh token del cuerpo.
 */
export function isPublicAuthEndpoint(url: string): boolean {
  return /\/api\/v1\/auth\//.test(url);
}

function withBearer<T>(request: HttpRequest<T>, token: string): HttpRequest<T> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Adjunta el access token a las peticiones hacia la API. Ante `401` renueva una
 * sola vez (single-flight) y reintenta; si la renovación falla, limpia la
 * sesión y vuelve a login. Ante `403` muestra el estado "no autorizado".
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(AppConfigService);
  if (!config.isApiUrl(request.url) || isPublicAuthEndpoint(request.url)) {
    return next(request);
  }

  const session = inject(SessionStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const sentToken = session.accessToken();
  const outgoing = sentToken ? withBearer(request, sentToken) : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);

      if (error.status === 401 && sentToken) {
        const current = session.accessToken();
        // Otra petición ya renovó el token mientras esta estaba en vuelo.
        const retry$ =
          current && current !== sentToken
            ? next(withBearer(request, current))
            : auth.refreshSession().pipe(
                catchError(() => {
                  auth.expireSession();
                  return throwError(() => error);
                }),
                switchMap((tokens) => next(withBearer(request, tokens.accessToken))),
              );
        return retry$.pipe(
          catchError((retryError: unknown) => {
            if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
              auth.expireSession();
            }
            return throwError(() => retryError);
          }),
        );
      }

      if (error.status === 403) {
        void router.navigate(['/no-autorizado'], { skipLocationChange: true });
      }
      return throwError(() => error);
    }),
  );
};
