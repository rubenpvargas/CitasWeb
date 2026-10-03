import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ProfessionalApi, AgendaItemDto } from '../../../core/api/professional.api';
import { errorMessage } from '../../../core/api/api-errors';
import { addDays, dateOf, formatShortDate, timeOf, todayInBogota } from '../../../core/time/bogota-time';

/** Agenda aprobada del profesional (trasladada; HU-023 en la Ola F). */
@Component({
  selector: 'app-professional-agenda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-card flex flex-col gap-3" aria-labelledby="agenda-title">
      <div class="flex justify-between items-center">
        <h2 id="agenda-title" class="font-semibold text-primary">Agenda aprobada (próximos 30 días)</h2>
        <button type="button" (click)="load()" class="ui-btn-ghost" [disabled]="loading()">Actualizar</button>
      </div>
      <div role="status" aria-live="polite">
        @if (loading()) { <p class="ui-empty">Cargando agenda...</p> }
      </div>
      <div role="alert" aria-live="assertive">
        @if (error()) { <p class="ui-alert-error">{{ error() }}</p> }
      </div>
      @if (!loading() && !error()) {
        @for (item of items(); track item.id) {
          <p class="py-3 border-b border-outline-variant/30 text-sm">
            {{ when(item.startAt) }} · {{ item.specialtyName }} · {{ item.patientFirstName }} {{ item.patientLastName }}
          </p>
        } @empty {
          <p class="text-sm text-on-surface-variant">Sin citas aprobadas en el rango actual.</p>
        }
      }
    </section>
  `,
})
export class AgendaComponent {
  private readonly api = inject(ProfessionalApi);
  readonly items = signal<AgendaItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  when(startAt: string): string {
    return `${formatShortDate(dateOf(startAt))} ${timeOf(startAt)}`;
  }

  load() {
    const from = todayInBogota();
    this.loading.set(true);
    this.error.set(null);
    this.api.agenda(from, addDays(from, 30)).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'No fue posible cargar la agenda.'));
        this.loading.set(false);
      },
    });
  }
}
