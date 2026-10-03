import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { OPERATIONS_LINKS } from './operations-links';

@Component({
  selector: 'app-operations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <main class="min-h-screen max-w-5xl mx-auto w-full p-5 pb-24 flex flex-col gap-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-widest text-secondary font-semibold">Operación protegida</p>
          <h1 class="text-2xl font-semibold text-primary">Agenda y administración</h1>
        </div>
        @if (canUsePortal()) {
          <button type="button" (click)="back()" class="px-3 py-2 rounded-lg bg-surface-container text-primary border-0 cursor-pointer">Volver al portal</button>
        }
      </header>

      <nav aria-label="Secciones de operación" class="flex gap-1 overflow-x-auto no-scrollbar border-b border-outline-variant/40">
        @for (link of links(); track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="text-primary border-primary font-semibold"
            #rla="routerLinkActive"
            ariaCurrentWhenActive="page"
            [class.text-on-surface-variant]="!rla.isActive"
            [class.border-transparent]="!rla.isActive"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 whitespace-nowrap transition-colors hover:text-primary"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ link.icon }}</span>
            {{ link.label }}
          </a>
        }
      </nav>

      <router-outlet />
    </main>
  `,
})
export class OperationsComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  readonly links = computed(() => OPERATIONS_LINKS.filter((link) => this.session.hasAnyRole(link.roles)));
  readonly canUsePortal = () => this.session.hasAnyRole(['USER']);

  back() {
    void this.router.navigate(['/inicio']);
  }
}
