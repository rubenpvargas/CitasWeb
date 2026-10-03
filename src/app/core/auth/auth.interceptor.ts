import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

/**
 * Opt-out para lecturas cuya pantalla muestra su propio estado ante `403`.
 * Las mutaciones (POST/PUT/PATCH/DELETE) nunca redirigen: la pantalla muestra
 * el mensaje en contexto.
 */
export const HANDLE_FORBIDDEN_LOCALLY = new HttpContextToken<boolean>(() => false);

/** `true` si un `403` de esta petición debe llevar a la página "no autorizado". */
export function redirectsOnForbidden(request: HttpRequest<unknown>): boolean {
  return request.method === 'GET' && !request.context.get(HANDLE_FORBIDDEN_LOCALLY);
}

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
 * sesión y vuelve a login. Ante `403` en una lectura de pantalla muestra el
 * estado "no autorizado"; en mutaciones deja que la pantalla informe.
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

      if (error.status === 403 && redirectsOnForbidden(request)) {
        void router.navigate(['/no-autorizado'], { skipLocationChange: true });
      }
      return throwError(() => error);
    }),
  );
};
