import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi, InboxItemDto } from '../../../core/api/admin.api';
import { errorMessage } from '../../../core/api/api-errors';
import { formatShortDate, timeOf, dateOf } from '../../../core/time/bogota-time';

/**
 * Bandeja ADMIN trasladada desde la consola anterior. Las decisiones con motivo
 * obligatorio se endurecen en la Ola D/F (HU-018, HU-025).
 */
@Component({
  selector: 'app-admin-inbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col gap-3" aria-labelledby="inbox-title">
      <div class="flex items-center justify-between">
        <h2 id="inbox-title" class="ui-section-title">Solicitudes pendientes</h2>
        <button type="button" class="ui-btn-ghost" (click)="load()" [disabled]="loading()">Actualizar</button>
      </div>
      <div role="status" aria-live="polite">
        @if (loading()) { <p class="ui-empty">Cargando bandeja...</p> }
        @if (message()) { <p class="ui-alert-success">{{ message() }}</p> }
      </div>
      <div role="alert" aria-live="assertive">
        @if (error()) { <p class="ui-alert-error">{{ error() }}</p> }
      </div>
      @if (!loading() && !error()) {
        @for (item of items(); track item.itemType + '-' + item.id) {
          <article class="ui-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong class="text-primary">{{ item.itemType === 'RESCHEDULE' ? 'Reprogramación' : 'Cita' }} #{{ item.id }}</strong>
              <p class="text-sm text-on-surface-variant">{{ item.specialtyName }} · {{ item.status }} · {{ when(item.startAt) }} · {{ item.locationCode }}</p>
            </div>
            <div class="flex gap-2">
              <button type="button" (click)="decide(item, true)" class="px-3 py-2 rounded-lg bg-emerald-700 text-white border-0 cursor-pointer">Aprobar</button>
              <button type="button" (click)="decide(item, false)" class="px-3 py-2 rounded-lg bg-error text-white border-0 cursor-pointer">Rechazar</button>
            </div>
          </article>
        } @empty {
          <p class="ui-empty">No hay solicitudes pendientes.</p>
        }
      }
    </section>
  `,
})
export class InboxComponent {
  private readonly api = inject(AdminApi);
  readonly items = signal<InboxItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');

  constructor() {
    this.load();
  }

  when(startAt: string): string {
    return `${formatShortDate(dateOf(startAt))} ${timeOf(startAt)}`;
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listInbox().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'No fue posible cargar la bandeja.'));
        this.loading.set(false);
      },
    });
  }

  decide(item: InboxItemDto, approve: boolean) {
    this.message.set('');
    const reason = approve ? 'Decisión operativa sintética' : 'No cumple criterios de laboratorio';
    this.api.decide(item, approve, reason).subscribe({
      next: () => {
        this.message.set('Decisión guardada.');
        this.load();
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'La API rechazó la decisión.')),
    });
  }
}
