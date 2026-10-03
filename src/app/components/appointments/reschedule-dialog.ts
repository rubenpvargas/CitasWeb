import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { AppointmentDto, AvailabilityApi, AvailabilitySlotDto } from '../../core/api/availability.api';
import { AppointmentsApi, RescheduleResponse } from '../../core/api/appointments.api';
import { CatalogApi, CatalogLocationDto } from '../../core/api/catalog.api';
import { errorCode, errorMessage } from '../../core/api/api-errors';
import { MAX_RANGE_DAYS, addDays, dateOf, daysBetween, formatLongDate, formatShortDate, timeOf, todayInBogota } from '../../core/time/bogota-time';

/**
 * HU-021: reprogramación. Busca disponibilidad del MISMO profesional y
 * especialidad (`GET /availability` con `specialtyId` y `professionalId`) y
 * envía `POST /appointments/{id}/reschedule {startAt, locationCode}`. La cita
 * original no cambia hasta la decisión ADMIN.
 */
@Component({
  selector: 'app-reschedule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule],
  template: `
    <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="reschedule-title" data-testid="reschedule-dialog"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="close()"
        class="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-3 border border-outline-variant/40">
        <div class="flex items-center justify-between">
          <h2 id="reschedule-title" class="text-lg font-semibold text-primary m-0">Reprogramar cita</h2>
          <button type="button" (click)="close()" aria-label="Cerrar" class="p-1 text-outline hover:text-on-surface rounded-full cursor-pointer border-0 bg-transparent">
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>
        <p class="text-[13px] text-on-surface-variant">
          {{ appointment().specialtyName }} con <strong>{{ appointment().professionalName }}</strong>. Actual: {{ longDate(appointment().startAt) }} a las {{ time(appointment().startAt) }}.
          Tu cita actual se mantiene hasta que un administrador apruebe el cambio.
        </p>

        <form (submit)="$event.preventDefault(); search()" class="grid grid-cols-2 gap-2" data-testid="reschedule-search-form">
          <div class="flex flex-col gap-1">
            <label for="rs-from" class="text-[12px] text-on-surface-variant font-medium">Desde</label>
            <input id="rs-from" type="date" class="ui-input" [min]="today" [value]="from()" (change)="from.set($any($event.target).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="rs-to" class="text-[12px] text-on-surface-variant font-medium">Hasta</label>
            <input id="rs-to" type="date" class="ui-input" [min]="today" [value]="to()" (change)="to.set($any($event.target).value)" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label for="rs-location" class="text-[12px] text-on-surface-variant font-medium">Sede</label>
            <select id="rs-location" class="ui-input" (change)="location.set($any($event.target).value)">
              <option value="">Cualquier sede del profesional</option>
              @for (l of locations(); track l.code) { <option [value]="l.code">{{ l.name }}</option> }
            </select>
          </div>
          <button type="submit" class="ui-btn-secondary col-span-2" data-testid="reschedule-search" [disabled]="searching()">
            {{ searching() ? 'Buscando cupos...' : 'Buscar nuevos horarios' }}
          </button>
        </form>

        <div role="status" aria-live="polite">
          @if (searching()) { <p class="ui-empty">Buscando cupos del mismo profesional...</p> }
          @if (searched() && !searching() && !searchFailed() && slots().length === 0) {
            <p class="ui-empty" data-testid="reschedule-empty">El profesional no tiene cupos libres en este rango.</p>
          }
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (error()) { <p class="ui-alert-error" data-testid="reschedule-error">{{ error() }}</p> }
        </div>

        @if (slots().length > 0) {
          <ul class="flex flex-col gap-1.5 max-h-56 overflow-y-auto" aria-label="Horarios disponibles para reprogramar">
            @for (slot of slots(); track slot.locationCode + slot.startAt) {
              <li>
                <button type="button" (click)="selected.set(slot)" [attr.aria-pressed]="selected() === slot"
                  [attr.data-testid]="'rs-slot-' + slot.startAt"
                  [class.bg-primary-container]="selected() === slot" [class.text-white]="selected() === slot"
                  [class.bg-surface-container-low]="selected() !== slot"
                  class="w-full py-2 px-3 text-left rounded-lg border border-outline-variant/30 text-[12px] font-semibold cursor-pointer flex justify-between gap-2">
                  <span class="capitalize">{{ shortDate(slot.startAt) }} · {{ time(slot.startAt) }}–{{ time(slot.endAt) }}</span>
                  <span class="font-normal">{{ slot.locationName }}</span>
                </button>
              </li>
            }
          </ul>
        }

        <button type="button" class="ui-btn-primary" data-testid="reschedule-submit" (click)="submit()" [disabled]="!selected() || submitting()">
          {{ submitting() ? 'Enviando solicitud...' : 'Solicitar reprogramación' }}
        </button>
      </div>
    </div>
  `,
})
export class RescheduleDialogComponent implements OnInit {
  private readonly availability = inject(AvailabilityApi);
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly catalogs = inject(CatalogApi);

  readonly appointment = input.required<AppointmentDto>();
  readonly requested = output<RescheduleResponse>();
  readonly closed = output<void>();

  readonly today = todayInBogota();
  readonly from = signal(this.today);
  readonly to = signal(addDays(this.today, 6));
  readonly location = signal('');
  readonly allLocations = signal<CatalogLocationDto[]>([]);
  readonly locations = computed(() => this.allLocations().filter((l) => l.active));
  readonly slots = signal<AvailabilitySlotDto[]>([]);
  readonly selected = signal<AvailabilitySlotDto | null>(null);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly searchFailed = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.catalogs.getCatalogs().subscribe({ next: (c) => this.allLocations.set(c.locations), error: () => undefined });
    this.search();
  }

  longDate(value: string): string {
    return formatLongDate(dateOf(value));
  }

  shortDate(value: string): string {
    return formatShortDate(dateOf(value));
  }

  time(value: string): string {
    return timeOf(value);
  }

  close() {
    if (!this.submitting()) this.closed.emit();
  }

  search(keepError = false) {
    const span = daysBetween(this.from(), this.to());
    if (span < 0 || span > MAX_RANGE_DAYS) {
      this.error.set(`Elige un rango válido de hasta ${MAX_RANGE_DAYS} días.`);
      return;
    }
    const a = this.appointment();
    this.searching.set(true);
    if (!keepError) this.error.set(null);
    this.selected.set(null);
    this.searchFailed.set(false);
    this.availability
      .search({ specialtyId: a.specialtyId, professionalId: a.professionalId, from: this.from(), to: this.to(), locationCode: this.location() || null })
      .subscribe({
        next: (slots) => {
          // Solo franjas del mismo profesional/especialidad devueltas por el backend.
          this.slots.set(slots.filter((s) => s.professionalId === a.professionalId && s.startAt !== a.startAt));
          this.searching.set(false);
          this.searched.set(true);
        },
        error: (e: unknown) => {
          this.slots.set([]);
          this.searching.set(false);
          this.searched.set(true);
          this.searchFailed.set(true);
          this.error.set(errorMessage(e, 'No fue posible consultar la disponibilidad.'));
        },
      });
  }

  submit() {
    const slot = this.selected();
    if (!slot || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.appointmentsApi.reschedule(this.appointment().id, { startAt: slot.startAt, locationCode: slot.locationCode }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.requested.emit(response);
      },
      error: (e: unknown) => {
        this.submitting.set(false);
        this.error.set(errorMessage(e, 'No fue posible solicitar la reprogramación.'));
        if (errorCode(e) === 'SLOT_UNAVAILABLE') this.search(true);
      },
    });
  }
}
