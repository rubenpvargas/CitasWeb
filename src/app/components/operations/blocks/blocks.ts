import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BlockFormComponent } from './block-form';
import { BlockRequest, CalendarBlockDto, ProfessionalApi } from '../../../core/api/professional.api';
import { CatalogApi, CatalogLocationDto } from '../../../core/api/catalog.api';
import { errorMessage } from '../../../core/api/api-errors';
import { MAX_RANGE_DAYS, addDays, daysBetween, formatLongDate, hhmm, nowInBogota, todayInBogota } from '../../../core/time/bogota-time';

export interface CalendarDay {
  date: string;
  blocks: CalendarBlockDto[];
}

/** Motivo visible cuando el backend marca un bloque como no editable (HU-013/014). */
export function lockReason(block: CalendarBlockDto, now: string = nowInBogota()): string | null {
  if (block.editable) return null;
  if (`${block.date}T${hhmm(block.startTime)}` <= now) return 'Bloque pasado o en curso: no se puede modificar ni eliminar.';
  if (block.committedSlots > 0) return 'Tiene citas reservadas o retenidas: no se puede modificar ni eliminar.';
  return 'El servidor no permite modificar este bloque.';
}

/** Disponibilidad del profesional: publicar bloques (HU-012) y calendario propio (HU-014). */
@Component({
  selector: 'app-professional-blocks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlockFormComponent],
  template: `
    <div class="grid md:grid-cols-[1fr_1.5fr] gap-5">
      <section class="ui-card flex flex-col gap-3" aria-labelledby="block-create-title">
        <h2 id="block-create-title" class="ui-section-title">Publicar bloque futuro</h2>
        <div role="status" aria-live="polite">
          @if (locationsLoading()) { <p class="ui-empty">Cargando sedes...</p> }
          @if (createMessage()) { <p class="ui-alert-success" data-testid="block-created">{{ createMessage() }}</p> }
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (createError()) { <p class="ui-alert-error" data-testid="block-create-error">{{ createError() }}</p> }
        </div>
        @if (!locationsLoading() && activeLocations().length === 0 && !createError()) {
          <p class="ui-empty">No hay sedes activas disponibles.</p>
        }
        @if (activeLocations().length > 0) {
          <app-block-form [locations]="activeLocations()" [saving]="creating()" (submitted)="create($event)" />
        }
      </section>

      <section class="ui-card flex flex-col gap-3" aria-labelledby="calendar-title">
        <h2 id="calendar-title" class="ui-section-title">Mi calendario de bloques</h2>
        <form (submit)="$event.preventDefault(); loadCalendar()" class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end" data-testid="calendar-filters" aria-describedby="calendar-range-help">
          <div class="flex flex-col gap-1">
            <label for="cal-from" class="ui-label">Desde</label>
            <input id="cal-from" type="date" class="ui-input" [value]="from()" (change)="from.set($any($event.target).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="cal-to" class="ui-label">Hasta</label>
            <input id="cal-to" type="date" class="ui-input" [value]="to()" (change)="to.set($any($event.target).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="cal-location" class="ui-label">Sede</label>
            <select id="cal-location" class="ui-input" (change)="locationFilter.set($any($event.target).value)">
              <option value="">Todas</option>
              @for (l of locations(); track l.code) { <option [value]="l.code">{{ l.name }}</option> }
            </select>
          </div>
          <button type="submit" class="ui-btn-secondary" data-testid="calendar-search" [disabled]="calendarLoading()">Consultar</button>
        </form>
        <p id="calendar-range-help" class="text-[11px] text-on-surface-variant">Rango máximo de {{ maxRange }} días.</p>

        <div role="status" aria-live="polite">
          @if (calendarLoading()) { <p class="ui-empty">Cargando calendario...</p> }
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (calendarError()) { <p class="ui-alert-error" data-testid="calendar-error">{{ calendarError() }}</p> }
        </div>

        @if (!calendarLoading() && !calendarError()) {
          @for (day of days(); track day.date) {
            <div class="flex flex-col gap-2">
              <h3 class="text-[13px] font-semibold text-primary capitalize">{{ longDate(day.date) }}</h3>
              <ul class="flex flex-col gap-2" [attr.aria-label]="'Bloques del ' + longDate(day.date)">
                @for (b of day.blocks; track b.id) {
                  <li class="ui-row flex-col items-stretch gap-2" [attr.data-testid]="'block-' + b.id">
                    <div class="flex flex-wrap items-center gap-3">
                      <span class="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">schedule</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-semibold text-on-surface">{{ time(b.startTime) }}–{{ time(b.endTime) }} · {{ b.locationName || b.locationCode }}</p>
                        <p class="text-[11px] text-on-surface-variant">{{ b.committedSlots }} de {{ b.totalSlots }} cupos comprometidos</p>
                      </div>
                      <span class="ui-badge" [class]="b.editable ? 'bg-secondary-container/30 text-primary' : 'bg-surface-container-high text-on-surface-variant'">
                        {{ b.editable ? 'Editable' : 'Bloqueado' }}
                      </span>
                    </div>
                    @if (reason(b); as r) {
                      <p class="text-[12px] text-on-surface-variant flex items-center gap-1" [attr.data-testid]="'block-reason-' + b.id">
                        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>{{ r }}
                      </p>
                    }
                  </li>
                }
              </ul>
            </div>
          } @empty {
            <p class="ui-empty" data-testid="calendar-empty">No tienes bloques en el rango seleccionado.</p>
          }
        }
      </section>
    </div>
  `,
})
export class BlocksComponent {
  protected readonly api = inject(ProfessionalApi);
  private readonly catalogs = inject(CatalogApi);

  readonly locations = signal<CatalogLocationDto[]>([]);
  readonly locationsLoading = signal(true);
  readonly activeLocations = computed(() => this.locations().filter((l) => l.active));

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createMessage = signal('');

  // HU-014 calendario
  readonly maxRange = MAX_RANGE_DAYS;
  readonly from = signal(todayInBogota());
  readonly to = signal(addDays(todayInBogota(), 13));
  readonly locationFilter = signal('');
  readonly blocks = signal<CalendarBlockDto[]>([]);
  readonly calendarLoading = signal(false);
  readonly calendarError = signal<string | null>(null);
  readonly days = computed<CalendarDay[]>(() => {
    const byDate = new Map<string, CalendarBlockDto[]>();
    for (const b of [...this.blocks()].sort((a, c) => (a.date + a.startTime).localeCompare(c.date + c.startTime))) {
      byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);
    }
    return Array.from(byDate, ([date, blocks]) => ({ date, blocks }));
  });

  constructor() {
    this.loadCalendar();
    this.catalogs.getCatalogs().subscribe({
      next: (c) => {
        this.locations.set(c.locations);
        this.locationsLoading.set(false);
      },
      error: (e: unknown) => {
        this.createError.set(errorMessage(e, 'No fue posible cargar las sedes.'));
        this.locationsLoading.set(false);
      },
    });
  }

  longDate(date: string): string {
    return formatLongDate(date);
  }

  time(value: string): string {
    return hhmm(value);
  }

  reason(block: CalendarBlockDto): string | null {
    return lockReason(block);
  }

  loadCalendar() {
    const from = this.from();
    const to = this.to();
    const span = daysBetween(from, to);
    if (!from || !to || span < 0) {
      this.calendarError.set('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }
    if (span > MAX_RANGE_DAYS) {
      this.calendarError.set(`El rango de consulta no puede superar ${MAX_RANGE_DAYS} días.`);
      return;
    }
    this.calendarLoading.set(true);
    this.calendarError.set(null);
    this.api.calendar(from, to, this.locationFilter() || null).subscribe({
      next: (blocks) => {
        this.blocks.set(blocks);
        this.calendarLoading.set(false);
      },
      error: (e: unknown) => {
        this.calendarError.set(errorMessage(e, 'No fue posible cargar el calendario.'));
        this.calendarLoading.set(false);
      },
    });
  }

  describe(b: Pick<CalendarBlockDto, 'date' | 'startTime' | 'endTime'>): string {
    return `${formatLongDate(b.date)}, ${hhmm(b.startTime)}–${hhmm(b.endTime)}`;
  }

  create(request: BlockRequest) {
    this.creating.set(true);
    this.createError.set(null);
    this.createMessage.set('');
    this.api.createBlock(request).subscribe({
      next: () => {
        this.creating.set(false);
        this.createMessage.set(`Bloque publicado: ${this.describe(request)}.`);
        this.afterChange();
      },
      error: (e: unknown) => {
        this.creating.set(false);
        this.createError.set(errorMessage(e, 'No fue posible publicar el bloque.'));
      },
    });
  }

  /** Punto de extensión para refrescar el calendario (HU-014). */
  protected afterChange(): void {
    this.loadCalendar();
  }
}
