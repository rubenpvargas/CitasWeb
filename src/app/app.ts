import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { SessionStore } from './core/auth/session.store';
import { Role } from './core/api/api.types';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** Roles que pueden ver la opción; vacío = cualquier usuario autenticado. */
  roles: readonly Role[];
  badge?: boolean;
}

/** Opciones de la barra inferior. Filtrarlas por rol es solo UX: el backend autoriza. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/inicio', label: 'Inicio', icon: 'home', roles: ['USER'] },
  { path: '/reservar', label: 'Solicitar', icon: 'event_available', roles: ['USER'], badge: true },
  { path: '/mis-citas', label: 'Mis citas', icon: 'calendar_month', roles: ['USER'] },
  { path: '/operacion', label: 'Operación', icon: 'admin_panel_settings', roles: ['ADMIN', 'PROFESSIONAL'] },
  { path: '/perfil', label: 'Perfil', icon: 'person', roles: [] },
];

const PORTAL_PATHS = NAV_ITEMS.map((item) => item.path);

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  // Se instancia para registrar el manejo de expiración de sesión.
  private readonly auth = inject(AuthService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly navItems = computed(() => {
    if (!this.session.isAuthenticated()) return [];
    return NAV_ITEMS.filter((item) => item.roles.length === 0 || this.session.hasAnyRole(item.roles));
  });

  readonly showPortalNav = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return this.session.isAuthenticated() && PORTAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  });
}
