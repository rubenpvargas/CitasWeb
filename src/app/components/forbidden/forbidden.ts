import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { roleHome } from '../../core/auth/role-home';

@Component({
  selector: 'app-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-8 bg-surface justify-center">
      <div class="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-xs border border-outline-variant/40 flex flex-col items-center text-center">
        <div class="w-14 h-14 rounded-2xl bg-error-container flex items-center justify-center text-error mb-3 shadow-xs">
          <span class="material-symbols-outlined text-[28px]" aria-hidden="true">block</span>
        </div>
        <h1 class="text-2xl text-on-surface font-semibold mb-1 tracking-tight">Acceso no autorizado</h1>
        <p role="alert" class="text-[14px] text-on-surface-variant max-w-sm leading-relaxed mb-5">
          Tu cuenta no tiene permisos para ver esta sección. Si crees que es un error, comunícate con la mesa de ayuda.
        </p>
        <a
          [routerLink]="homeLink()"
          class="w-full h-11 bg-primary-container hover:bg-primary text-white text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          <span>{{ session.isAuthenticated() ? 'Volver al inicio' : 'Iniciar sesión' }}</span>
        </a>
      </div>
    </main>
  `,
})
export class ForbiddenComponent {
  readonly session = inject(SessionStore);
  readonly homeLink = computed(() => (this.session.isAuthenticated() ? roleHome(this.session.roles()) : '/login'));
}
