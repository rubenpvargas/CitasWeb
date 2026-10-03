import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { ProfessionalApi, AgendaItemDto, CloseOutcome } from '../../../core/api/professional.api';
import { CatalogApi, CatalogLocationDto } from '../../../core/api/catalog.api';
import { errorCode, errorMessage } from '../../../core/api/api-errors';
import { MAX_RANGE_DAYS, addDays, dateOf, daysBetween, formatLongDate, timeOf, todayInBogota } from '../../../core/time/bogota-time';

export type AgendaPreset = 'day' | 'week' | 'custom';

export const OUTCOME_LABELS: Record<CloseOutcome, string> = { COMPLETED: 'Atendida', NO_SHOW: 'No asistió' };

/**
 * HU-023: agenda propia del profesional (`GET /professional/agenda`). Solo
 * citas APROBADAS devueltas por el backend y solo el nombre del paciente.
 * HU-024: cierre COMPLETED/NO_SHOW solo cuando el backend marca `closable`.
 */
@Component({
  selector: 'app-professional-agenda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule],
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
                  @if (item.closable) {
                    <div class="flex gap-2" role="group" [attr.aria-label]="'Cerrar atención de ' + item.patientName">
                      <button type="button" class="ui-btn-ghost border border-outline-variant/40" [attr.data-testid]="'close-completed-' + item.id"
                        (click)="askClose(item, 'COMPLETED')">Marcar atendida</button>
                      <button type="button" class="ui-btn-ghost border border-outline-variant/40 text-error" [attr.data-testid]="'close-noshow-' + item.id"
                        (click)="askClose(item, 'NO_SHOW')">Marcar no asistió</button>
                    </div>
                  } @else {
                    <p class="text-[11px] text-on-surface-variant flex items-center gap-1" [attr.data-testid]="'not-closable-' + item.id">
                      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">lock_clock</span>
                      El cierre estará disponible cuando inicie la cita.
                    </p>
                  }
                </li>
              }
            </ul>
          </div>
        } @empty {
          <p class="ui-empty" data-testid="agenda-empty">Sin citas aprobadas en el periodo seleccionado.</p>
        }
      }
    </section>

    @if (closeTarget(); as target) {
      <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div role="alertdialog" aria-modal="true" aria-labelledby="close-title" aria-describedby="close-desc" data-testid="close-dialog"
          cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="dismissClose()"
          class="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3 border border-outline-variant/40">
          <h2 id="close-title" class="text-lg font-semibold text-primary m-0">¿Cerrar como "{{ outcomeLabel(target.outcome) }}"?</h2>
          <p id="close-desc" class="text-[13px] text-on-surface-variant">
            {{ target.item.patientName }} · {{ time(target.item.startAt) }} · {{ target.item.specialtyName }}. Esta acción no se puede deshacer.
          </p>
          @if (closeError()) { <p class="ui-alert-error" role="alert" data-testid="close-error">{{ closeError() }}</p> }
          <div class="flex gap-2">
            <button type="button" class="ui-btn-secondary flex-1" (click)="dismissClose()" [disabled]="closing()">Volver</button>
            <button type="button" class="ui-btn-primary flex-1" data-testid="close-confirm" (click)="confirmClose()" [disabled]="closing()">
              {{ closing() ? 'Guardando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
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

  readonly closeTarget = signal<{ item: AgendaItemDto; outcome: CloseOutcome } | null>(null);
  readonly closing = signal(false);
  readonly closeError = signal<string | null>(null);

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

  outcomeLabel(outcome: CloseOutcome): string {
    return OUTCOME_LABELS[outcome];
  }

  askClose(item: AgendaItemDto, outcome: CloseOutcome) {
    this.message.set('');
    this.closeError.set(null);
    this.closeTarget.set({ item, outcome });
  }

  dismissClose() {
    if (!this.closing()) this.closeTarget.set(null);
  }

  confirmClose() {
    const target = this.closeTarget();
    if (!target || this.closing()) return;
    this.closing.set(true);
    this.closeError.set(null);
    this.api.closeAppointment(target.item.id, target.outcome).subscribe({
      next: () => {
        this.closing.set(false);
        this.closeTarget.set(null);
        this.message.set(`Atención de ${target.item.patientName} cerrada como "${OUTCOME_LABELS[target.outcome]}".`);
        this.load();
      },
      error: (e: unknown) => {
        this.closing.set(false);
        this.closeError.set(errorMessage(e, 'No fue posible cerrar la atención.'));
        if (['INVALID_TRANSITION', 'NOT_FOUND'].includes(errorCode(e))) this.load();
      },
    });
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
