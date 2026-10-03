import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ProfessionalApi, AgendaItemDto } from '../../../core/api/professional.api';
import { CatalogApi, CatalogLocationDto } from '../../../core/api/catalog.api';
import { errorMessage } from '../../../core/api/api-errors';
import { MAX_RANGE_DAYS, addDays, dateOf, daysBetween, formatLongDate, timeOf, todayInBogota } from '../../../core/time/bogota-time';

export type AgendaPreset = 'day' | 'week' | 'custom';

/**
 * HU-023: agenda propia del profesional (`GET /professional/agenda`). Solo
 * citas APROBADAS devueltas por el backend y solo el nombre del paciente.
 */
@Component({
  selector: 'app-professional-agenda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-card flex flex-col gap-3" aria-labelledby="agenda-title">
      <h2 id="agenda-title" class="ui-section-title">Mi agenda de citas aprobadas</h2>

      <div class="flex flex-wrap gap-2" role="group" aria-label="Periodo">
        <button type="button" class="ui-btn-ghost border border-outline-variant/40" data-testid="preset-day"
          [attr.aria-pressed]="preset() === 'day'" [class.bg-primary-container]="preset() === 'day'" [class.text-white]="preset() === 'day'"
          (click)="applyPreset('day')">Hoy</button>
        <button type="button" class="ui-btn-ghost border border-outline-variant/40" data-testid="preset-week"
          [attr.aria-pressed]="preset() === 'week'" [class.bg-primary-container]="preset() === 'week'" [class.text-white]="preset() === 'week'"
          (click)="applyPreset('week')">Próximos 7 días</button>
      </div>

      <form (submit)="$event.preventDefault(); custom()" class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end" data-testid="agenda-filters">
        <div class="flex flex-col gap-1">
          <label for="ag-from" class="ui-label">Desde</label>
          <input id="ag-from" type="date" class="ui-input" [value]="from()" (change)="from.set($any($event.target).value)" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="ag-to" class="ui-label">Hasta</label>
          <input id="ag-to" type="date" class="ui-input" [value]="to()" (change)="to.set($any($event.target).value)" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="ag-location" class="ui-label">Sede</label>
          <select id="ag-location" class="ui-input" (change)="location.set($any($event.target).value); load()">
            <option value="">Todas</option>
            @for (l of activeLocations(); track l.code) { <option [value]="l.code">{{ l.name }}</option> }
          </select>
        </div>
        <button type="submit" class="ui-btn-secondary" data-testid="agenda-apply" [disabled]="loading()">Consultar</button>
      </form>

      <div role="status" aria-live="polite">
        @if (loading()) { <p class="ui-empty" data-testid="agenda-loading">Cargando agenda...</p> }
        @if (message()) { <p class="ui-alert-success" data-testid="agenda-message">{{ message() }}</p> }
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true">
        @if (error()) { <p class="ui-alert-error" data-testid="agenda-error">{{ error() }}</p> }
      </div>

      @if (!loading() && !error()) {
        @for (day of days(); track day.date) {
          <div class="flex flex-col gap-2">
            <h3 class="text-[13px] font-semibold text-primary capitalize m-0">{{ longDate(day.date) }}</h3>
            <ul class="flex flex-col gap-2" [attr.aria-label]="'Citas del ' + longDate(day.date)">
              @for (item of day.items; track item.id) {
                <li class="ui-row flex-col items-stretch gap-2" [attr.data-testid]="'agenda-' + item.id">
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">schedule</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-[13px] font-semibold text-on-surface">{{ time(item.startAt) }}–{{ time(item.endAt) }} · {{ item.patientName }}</p>
                      <p class="text-[11px] text-on-surface-variant">{{ item.specialtyName }} · {{ item.locationName || item.locationCode }}</p>
                    </div>
                    <span class="ui-badge bg-emerald-50 text-emerald-800">Confirmada</span>
                  </div>
                  <!-- agenda-actions -->
                </li>
              }
            </ul>
          </div>
        } @empty {
          <p class="ui-empty" data-testid="agenda-empty">Sin citas aprobadas en el periodo seleccionado.</p>
        }
      }
    </section>
  `,
})
export class AgendaComponent {
  protected readonly api = inject(ProfessionalApi);
  private readonly catalogs = inject(CatalogApi);

  readonly preset = signal<AgendaPreset>('day');
  readonly from = signal(todayInBogota());
  readonly to = signal(todayInBogota());
  readonly location = signal('');
  readonly locations = signal<CatalogLocationDto[]>([]);
  readonly activeLocations = computed(() => this.locations().filter((l) => l.active));

  readonly items = signal<AgendaItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');

  readonly days = computed(() => {
    const byDate = new Map<string, AgendaItemDto[]>();
    for (const item of [...this.items()].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
      const d = dateOf(item.startAt);
      byDate.set(d, [...(byDate.get(d) ?? []), item]);
    }
    return Array.from(byDate, ([date, items]) => ({ date, items }));
  });

  constructor() {
    this.catalogs.getCatalogs().subscribe({ next: (c) => this.locations.set(c.locations), error: () => undefined });
    this.load();
  }

  longDate(date: string): string {
    return formatLongDate(date);
  }

  time(value: string): string {
    return timeOf(value);
  }

  applyPreset(preset: AgendaPreset) {
    const today = todayInBogota();
    this.preset.set(preset);
    this.from.set(today);
    this.to.set(preset === 'week' ? addDays(today, 6) : today);
    this.load();
  }

  custom() {
    this.preset.set('custom');
    this.load();
  }

  load() {
    const span = daysBetween(this.from(), this.to());
    if (!this.from() || !this.to() || span < 0) {
      this.error.set('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }
    if (span > MAX_RANGE_DAYS) {
      this.error.set(`El rango no puede superar ${MAX_RANGE_DAYS} días.`);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.agenda(this.from(), this.to(), this.location() || null).subscribe({
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
