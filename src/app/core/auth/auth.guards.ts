import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';
import { roleHome } from './role-home';

/** Exige sesión vigente; si no existe, envía a login conservando la URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  if (session.hasValidSession()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Exige alguno de los roles de `data.roles`. Es solo experiencia de usuario:
 * el backend conserva la autorización final.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (!session.hasValidSession()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const roles = (route.data['roles'] as readonly string[] | undefined) ?? [];
  if (roles.length === 0 || session.hasAnyRole(roles)) return true;
  return router.createUrlTree(['/no-autorizado']);
};

/** Solo para visitantes: con sesión vigente redirige al inicio del rol. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  if (!session.hasValidSession()) return true;
  return inject(Router).createUrlTree([roleHome(session.roles())]);
};
