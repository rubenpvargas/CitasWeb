import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PortalService } from '../../services/portal.service';
import { ActiveSpecialtyDto, CatalogApi, CatalogLocationDto } from '../../core/api/catalog.api';
import { AppointmentDto, AvailabilityApi, AvailabilitySlotDto } from '../../core/api/availability.api';
import { errorCode, errorMessage } from '../../core/api/api-errors';
import { appointmentStatusLabel } from '../../core/api/appointment-status';

export const SLOT_TAKEN_MESSAGE =
  'El horario seleccionado acaba de ser tomado por otra persona. Actualizamos los cupos disponibles: elige otro horario.';
import {
  MAX_RANGE_DAYS,
  addDays,
  dateOf,
  daysBetween,
  formatLongDate,
  formatShortDate,
  timeOf,
  todayInBogota,
} from '../../core/time/bogota-time';

export function slotKey(slot: AvailabilitySlotDto): string {
  return `${slot.professionalId}|${slot.locationCode}|${slot.startAt}`;
}

/**
 * HU-015: búsqueda de disponibilidad real. Especialidad (`GET /specialties`)
 * → sede opcional (`GET /catalogs`) → rango de fechas → `GET /availability`.
 * Solo se muestran las franjas devueltas por el backend; el cliente nunca
 * calcula disponibilidad. El tipo general/especializada se deriva de
 * `specialty.general`.
 */
@Component({
  selector: 'app-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header Fijo Superior -->
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="p-1 text-primary hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
            title="Volver"
            aria-label="Volver al inicio"
          >
            <span class="material-symbols-outlined text-[24px]" aria-hidden="true">arrow_back</span>
          </button>
          <div class="flex flex-col">
            <h1 class="text-[15px] font-semibold text-primary tracking-tight leading-none m-0">Solicitar Cita Médica</h1>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">HIC &bull; FCV Especialistas</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-secondary text-[11px] font-semibold border border-outline-variant/30">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
          <span>Cupos en tiempo real</span>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-28 bg-surface">
      <div class="flex flex-col w-full gap-5">

        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (catalogError()) { <p class="ui-alert-error" data-testid="booking-catalog-error">{{ catalogError() }}</p> }
        </div>

        <!-- Paso 1: Especialidad -->
        <section class="flex flex-col gap-2" aria-labelledby="step-specialty">
          <h2 id="step-specialty" class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold" aria-hidden="true">1</span>
            <span>Especialidad requerida</span>
          </h2>
          @if (specialtiesLoading()) {
            <p class="ui-empty" role="status">Cargando especialidades...</p>
          } @else if (specialties().length === 0 && !catalogError()) {
            <p class="ui-empty" data-testid="booking-no-specialties">No hay especialidades disponibles en este momento.</p>
          }
          <div class="grid grid-cols-2 gap-2">
            @for (esp of specialties(); track esp.id) {
              <button
                type="button"
                (click)="selectSpecialty(esp)"
                [attr.aria-pressed]="selectedSpecialty()?.id === esp.id"
                [attr.data-testid]="'specialty-' + esp.id"
                [class.bg-primary-container]="selectedSpecialty()?.id === esp.id"
                [class.text-white]="selectedSpecialty()?.id === esp.id"
                [class.bg-surface-container-lowest]="selectedSpecialty()?.id !== esp.id"
                [class.text-on-surface]="selectedSpecialty()?.id !== esp.id"
                class="p-3 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col items-start text-left gap-1.5 transition-all cursor-pointer hover:border-secondary"
              >
                <div
                  [class.text-white]="selectedSpecialty()?.id === esp.id"
                  [class.text-secondary]="selectedSpecialty()?.id !== esp.id"
                  class="w-7 h-7 rounded-lg bg-surface-container/60 flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ esp.general ? 'stethoscope' : 'medical_services' }}</span>
                </div>
                <span class="text-[13px] font-semibold leading-tight">{{ esp.name }}</span>
                <span class="text-[11px] opacity-75">{{ esp.general ? 'Cita general' : 'Requiere aprobación' }} · {{ esp.durationMinutes }} min</span>
              </button>
            }
          </div>
        </section>

        <!-- Paso 2: Sede Hospitalaria -->
        <section class="flex flex-col gap-2" aria-labelledby="step-location">
          <h2 id="step-location" class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold" aria-hidden="true">2</span>
            <span>Sede de atención (opcional)</span>
          </h2>
          <div class="flex flex-col gap-2">
            @for (loc of locationOptions(); track loc.code) {
              <button
                type="button"
                (click)="selectLocation(loc.code)"
                [attr.aria-pressed]="selectedLocation() === loc.code"
                [attr.data-testid]="'location-' + (loc.code || 'any')"
                [class.border-secondary]="selectedLocation() === loc.code"
                [class.bg-[#f2f3ff]]="selectedLocation() === loc.code"
                class="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-start gap-3 text-left transition-all cursor-pointer hover:border-secondary"
              >
                <div class="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ loc.code ? 'local_hospital' : 'travel_explore' }}</span>
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="text-[14px] font-semibold text-primary">{{ loc.name }}</span>
                  <span class="text-[12px] text-on-surface-variant">{{ loc.detail }}</span>
                </div>
                <div class="w-5 h-5 rounded-full border border-outline-variant flex items-center justify-center shrink-0 mt-0.5"
                     [class.bg-secondary]="selectedLocation() === loc.code">
                  @if (selectedLocation() === loc.code) {
                    <span class="material-symbols-outlined text-[14px] text-white" aria-hidden="true">check</span>
                  }
                </div>
              </button>
            }
          </div>
        </section>

        <!-- Paso 3: Rango de fechas -->
        <section class="flex flex-col gap-2" aria-labelledby="step-dates">
          <h2 id="step-dates" class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold" aria-hidden="true">3</span>
            <span>Fechas de búsqueda</span>
          </h2>
          <form (submit)="$event.preventDefault(); search()" class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col gap-2.5" data-testid="availability-form">
            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col gap-1">
                <label for="av-from" class="text-[12px] text-on-surface-variant font-medium">Desde</label>
                <input id="av-from" type="date" class="ui-input" [min]="today" [value]="from()" (change)="from.set($any($event.target).value)" />
              </div>
              <div class="flex flex-col gap-1">
                <label for="av-to" class="text-[12px] text-on-surface-variant font-medium">Hasta</label>
                <input id="av-to" type="date" class="ui-input" [min]="today" [value]="to()" (change)="to.set($any($event.target).value)" />
              </div>
            </div>
            <p class="text-[11px] text-on-surface-variant">Rango máximo de {{ maxRange }} días.</p>
            <button type="submit" class="ui-btn-primary" data-testid="availability-search" [disabled]="!selectedSpecialty() || searching()">
              @if (searching()) {
                <span class="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                <span>Buscando cupos...</span>
              } @else {
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">search</span>
                <span>{{ selectedSpecialty() ? 'Buscar disponibilidad' : 'Elige una especialidad' }}</span>
              }
            </button>
          </form>
        </section>

        <!-- Paso 4: Resultados -->
        <section class="flex flex-col gap-2" aria-labelledby="step-slots" [attr.aria-busy]="searching()">
          <h2 id="step-slots" class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold" aria-hidden="true">4</span>
            <span>Especialista y horario</span>
          </h2>
          <div role="status" aria-live="polite">
            @if (searching()) { <p class="ui-empty" data-testid="availability-loading">Buscando cupos disponibles...</p> }
            @if (searched() && !searching() && !searchError() && slots().length === 0) {
              <p class="ui-empty" data-testid="availability-empty">No hay cupos disponibles con estos criterios. Prueba otro rango de fechas o sede.</p>
            }
            @if (searched() && !searching() && slots().length > 0) {
              <p class="sr-only">{{ slots().length }} horarios disponibles.</p>
            }
          </div>
          <div role="alert" aria-live="assertive" aria-atomic="true">
            @if (slotTakenMessage()) { <p class="ui-alert-error" data-testid="slot-taken">{{ slotTakenMessage() }}</p> }
            @if (searchError()) { <p class="ui-alert-error" data-testid="availability-error">{{ searchError() }}</p> }
          </div>

          @if (professionals().length > 1) {
            <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por especialista">
              <button type="button" class="ui-badge border border-outline-variant/40 cursor-pointer py-1.5 px-3"
                [class.bg-primary-container]="selectedProfessional() === null" [class.text-white]="selectedProfessional() === null"
                [attr.aria-pressed]="selectedProfessional() === null" (click)="selectProfessional(null)">Todos</button>
              @for (pro of professionals(); track pro.id) {
                <button type="button" class="ui-badge border border-outline-variant/40 cursor-pointer py-1.5 px-3"
                  [attr.data-testid]="'professional-' + pro.id"
                  [class.bg-primary-container]="selectedProfessional() === pro.id" [class.text-white]="selectedProfessional() === pro.id"
                  [attr.aria-pressed]="selectedProfessional() === pro.id" (click)="selectProfessional(pro.id)">{{ pro.name }}</button>
              }
            </div>
          }

          @if (days().length > 0) {
            <div class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col gap-2.5">
              <span class="text-[12px] text-on-surface-variant font-medium" id="days-label">Días disponibles:</span>
              <div class="grid grid-cols-3 gap-2" role="group" aria-labelledby="days-label">
                @for (day of days(); track day) {
                  <button
                    type="button"
                    (click)="selectDate(day)"
                    [attr.aria-pressed]="activeDate() === day"
                    [attr.data-testid]="'day-' + day"
                    [class.border-secondary]="activeDate() === day"
                    [class.bg-secondary-container/20]="activeDate() === day"
                    class="p-2.5 rounded-lg border border-outline-variant/40 text-center flex flex-col items-center cursor-pointer hover:border-secondary transition-all"
                  >
                    <span class="text-[12px] font-semibold text-primary capitalize">{{ shortDate(day) }}</span>
                  </button>
                }
              </div>

              <span class="text-[12px] text-on-surface-variant font-medium mt-1" id="times-label">Horarios de consulta:</span>
              <ul class="flex flex-col gap-1.5" aria-labelledby="times-label">
                @for (slot of slotsForDate(); track key(slot)) {
                  <li>
                    <button
                      type="button"
                      (click)="selectSlot(slot)"
                      [attr.aria-pressed]="selectedKey() === key(slot)"
                      [attr.data-testid]="'slot-' + key(slot)"
                      [class.bg-primary-container]="selectedKey() === key(slot)"
                      [class.text-white]="selectedKey() === key(slot)"
                      [class.bg-surface-container-low]="selectedKey() !== key(slot)"
                      [class.text-on-surface]="selectedKey() !== key(slot)"
                      class="w-full py-2 px-3 text-left rounded-lg border border-outline-variant/30 text-[12px] font-semibold cursor-pointer hover:border-primary-container transition-all flex items-center justify-between gap-2"
                    >
                      <span>{{ time(slot.startAt) }}–{{ time(slot.endAt) }}</span>
                      <span class="font-normal truncate">{{ slot.professionalName }} · {{ slot.locationName }}</span>
                    </button>
                  </li>
                }
              </ul>
            </div>
          }
        </section>

        <!-- Resumen de Confirmación -->
        @if (selectedSlot(); as slot) {
          <section class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-xs flex flex-col gap-3" aria-labelledby="summary-title" data-testid="booking-summary">
            <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <h2 id="summary-title" class="text-[13px] font-bold text-primary uppercase tracking-wide m-0">Resumen del Agendamiento</h2>
              <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold" [class]="isGeneral() ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container-high text-primary'">{{ isGeneral() ? 'Cita general' : 'Cita especializada · requiere aprobación' }}</span>
            </div>
            <div class="flex flex-col gap-1 text-[13px]">
              <p><strong class="text-primary">Especialidad:</strong> {{ slot.specialtyName }}</p>
              <p><strong class="text-primary">Especialista:</strong> {{ slot.professionalName }}</p>
              <p><strong class="text-primary">Lugar:</strong> {{ slot.locationName }}</p>
              <p><strong class="text-primary">Fecha y Hora:</strong> {{ longDate(slot.startAt) }} a las {{ time(slot.startAt) }} ({{ slot.durationMinutes }} min)</p>
            </div>
            <div class="flex flex-col gap-1">
              <label for="booking-reason" class="text-[12px] text-on-surface-variant font-medium">Motivo de consulta (opcional)</label>
              <textarea id="booking-reason" rows="2" maxlength="500" class="ui-input h-auto py-2" data-testid="booking-reason"
                [value]="reason()" (input)="reason.set($any($event.target).value)" [disabled]="bookingLoading()"
                placeholder="Describe brevemente el motivo (sin datos sensibles)"></textarea>
            </div>
            @if (!isGeneral()) {
              <p class="text-[12px] text-on-surface-variant flex items-start gap-1.5" data-testid="booking-specialized-note">
                <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">info</span>
                Las citas especializadas requieren aprobación administrativa. Recibirás el resultado en "Mis citas".
              </p>
            }
            <div role="alert" aria-live="assertive" aria-atomic="true">
              @if (bookingError()) { <p class="ui-alert-error" data-testid="booking-error">{{ bookingError() }}</p> }
            </div>
            <div class="pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                (click)="confirmBooking()"
                [disabled]="bookingLoading()"
                data-testid="booking-confirm"
                class="w-full h-12 rounded-xl bg-primary-container text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-primary active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-75"
              >
                @if (bookingLoading()) {
                  <span class="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                  <span>{{ isGeneral() ? 'Confirmando cita médica...' : 'Enviando solicitud...' }}</span>
                } @else {
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">event_available</span>
                  <span>{{ isGeneral() ? 'Confirmar y agendar cita' : 'Enviar solicitud de cita' }}</span>
                }
              </button>
            </div>
          </section>
        }

      </div>
    </main>

    <!-- Modal Éxito de Agendamiento -->
    @if (booked(); as appt) {
      <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div role="dialog" aria-modal="true" aria-labelledby="booking-success-title" aria-describedby="booking-success-detail" data-testid="booking-success"
          class="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col items-center text-center border border-outline-variant/40">
          @if (appt.status === 'APPROVED') {
            <div class="w-16 h-16 rounded-full bg-[#89f5e7] flex items-center justify-center text-[#003d37] mb-4 shadow-xs">
              <span class="material-symbols-outlined text-[36px]" aria-hidden="true">check_circle</span>
            </div>
            <h2 id="booking-success-title" class="text-xl text-primary font-semibold tracking-tight mb-1">¡Cita agendada con éxito!</h2>
            <p class="text-[13px] text-on-surface-variant mb-4 leading-relaxed">
              Tu cita para <strong>{{ appt.specialtyName }}</strong> con <strong>{{ appt.professionalName }}</strong> quedó registrada.
            </p>
          } @else {
            <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-secondary mb-4 shadow-xs">
              <span class="material-symbols-outlined text-[36px]" aria-hidden="true">hourglass_top</span>
            </div>
            <h2 id="booking-success-title" class="text-xl text-primary font-semibold tracking-tight mb-1">Solicitud pendiente de aprobación</h2>
            <p class="text-[13px] text-on-surface-variant mb-4 leading-relaxed" data-testid="booking-pending-note">
              Enviamos tu solicitud de <strong>{{ appt.specialtyName }}</strong> con <strong>{{ appt.professionalName }}</strong>.
              Aún no es una cita confirmada: un administrador la revisará y el horario queda reservado para ti mientras tanto.
            </p>
          }
          <div id="booking-success-detail" class="w-full bg-surface-container-low p-3 rounded-xl mb-4 text-left text-[12px] text-on-surface-variant">
            <p class="font-semibold text-primary">{{ longDate(appt.startAt) }} · {{ time(appt.startAt) }}–{{ time(appt.endAt) }}</p>
            <p>{{ appt.locationName || appt.locationCode }}</p>
            <p>Estado: <strong data-testid="booking-success-status">{{ statusLabel(appt.status) }}</strong> · N.º {{ appt.id }}</p>
          </div>
          <button
            type="button"
            (click)="finishAndGoDashboard()"
            class="w-full h-11 rounded-lg bg-primary-container text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-xs hover:bg-primary transition-all cursor-pointer border-0"
          >
            <span>{{ appt.status === 'APPROVED' ? 'Ver en Inicio' : 'Entendido' }}</span>
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class BookingComponent {
  private readonly portalService = inject(PortalService);
  private readonly router = inject(Router);
  private readonly catalogs = inject(CatalogApi);
  protected readonly availability = inject(AvailabilityApi);

  readonly today = todayInBogota();
  readonly maxRange = MAX_RANGE_DAYS;

  readonly specialties = signal<ActiveSpecialtyDto[]>([]);
  readonly specialtiesLoading = signal(true);
  readonly locations = signal<CatalogLocationDto[]>([]);
  readonly catalogError = signal<string | null>(null);

  readonly selectedSpecialty = signal<ActiveSpecialtyDto | null>(null);
  readonly selectedLocation = signal('');
  readonly from = signal(this.today);
  readonly to = signal(addDays(this.today, 6));

  readonly slots = signal<AvailabilitySlotDto[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly selectedProfessional = signal<number | null>(null);
  readonly selectedDate = signal<string | null>(null);
  readonly selectedKey = signal<string | null>(null);

  readonly bookingLoading = signal(false);
  readonly booked = signal<AppointmentDto | null>(null);
  readonly reason = signal('');
  readonly bookingError = signal<string | null>(null);
  /** Aviso persistente tras un 409 SLOT_UNAVAILABLE (se muestra junto a los cupos recargados). */
  readonly slotTakenMessage = signal<string | null>(null);

  readonly isGeneral = computed(() => this.selectedSpecialty()?.general ?? false);

  readonly locationOptions = computed(() => [
    { code: '', name: 'Cualquier sede', detail: 'Buscar en todas las sedes disponibles' },
    ...this.locations()
      .filter((l) => l.active)
      .map((l) => ({ code: l.code, name: l.name, detail: [l.address, l.city].filter(Boolean).join(', ') })),
  ]);

  /** Profesionales presentes en las franjas devueltas (no existe un listado para USER). */
  readonly professionals = computed(() => {
    const map = new Map<number, string>();
    for (const s of this.slots()) map.set(s.professionalId, s.professionalName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  });

  private readonly visibleSlots = computed(() => {
    const pro = this.selectedProfessional();
    return [...this.slots()]
      .filter((s) => pro === null || s.professionalId === pro)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  });

  readonly days = computed(() => Array.from(new Set(this.visibleSlots().map((s) => dateOf(s.startAt)))));
  readonly activeDate = computed(() => {
    const d = this.selectedDate();
    return d && this.days().includes(d) ? d : (this.days()[0] ?? null);
  });
  readonly slotsForDate = computed(() => this.visibleSlots().filter((s) => dateOf(s.startAt) === this.activeDate()));
  readonly selectedSlot = computed(() => this.slots().find((s) => slotKey(s) === this.selectedKey()) ?? null);

  constructor() {
    this.catalogs.listActiveSpecialties().subscribe({
      next: (list) => {
        this.specialties.set(list);
        this.specialtiesLoading.set(false);
      },
      error: (e: unknown) => {
        this.catalogError.set(errorMessage(e, 'No fue posible cargar las especialidades.'));
        this.specialtiesLoading.set(false);
      },
    });
    this.catalogs.getCatalogs().subscribe({
      next: (c) => this.locations.set(c.locations),
      error: () => undefined,
    });
  }

  statusLabel(status: string): string {
    return appointmentStatusLabel(status);
  }

  key(slot: AvailabilitySlotDto): string {
    return slotKey(slot);
  }

  time(value: string): string {
    return timeOf(value);
  }

  shortDate(date: string): string {
    return formatShortDate(date);
  }

  longDate(value: string): string {
    return formatLongDate(dateOf(value));
  }

  private resetResults() {
    this.slotTakenMessage.set(null);
    this.slots.set([]);
    this.searched.set(false);
    this.searchError.set(null);
    this.selectedProfessional.set(null);
    this.selectedDate.set(null);
    this.selectedKey.set(null);
    this.bookingError.set(null);
  }

  selectSpecialty(esp: ActiveSpecialtyDto) {
    this.selectedSpecialty.set(esp);
    this.resetResults();
  }

  selectLocation(code: string) {
    this.selectedLocation.set(code);
    this.resetResults();
  }

  selectProfessional(id: number | null) {
    this.selectedProfessional.set(id);
    this.selectedKey.set(null);
  }

  selectDate(date: string) {
    this.selectedDate.set(date);
  }

  selectSlot(slot: AvailabilitySlotDto) {
    this.selectedKey.set(slotKey(slot));
    this.bookingError.set(null);
    this.slotTakenMessage.set(null);
  }

  search(keepMessage = false) {
    const specialty = this.selectedSpecialty();
    if (!specialty || this.searching()) return;
    const span = daysBetween(this.from(), this.to());
    if (!this.from() || !this.to() || span < 0) {
      this.searchError.set('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }
    if (span > MAX_RANGE_DAYS) {
      this.searchError.set(`El rango de búsqueda no puede superar ${MAX_RANGE_DAYS} días.`);
      return;
    }
    const previousKey = this.selectedKey();
    this.searching.set(true);
    this.searchError.set(null);
    if (!keepMessage) {
      this.bookingError.set(null);
      this.slotTakenMessage.set(null);
    }
    this.availability
      .search({ specialtyId: specialty.id, from: this.from(), to: this.to(), locationCode: this.selectedLocation() || null })
      .subscribe({
        next: (slots) => {
          this.slots.set(slots);
          this.searched.set(true);
          this.searching.set(false);
          // Conserva la selección solo si la franja sigue siendo devuelta por el backend.
          this.selectedKey.set(slots.some((s) => slotKey(s) === previousKey) ? previousKey : null);
        },
        error: (e: unknown) => {
          this.slots.set([]);
          this.searched.set(true);
          this.searching.set(false);
          this.selectedKey.set(null);
          this.searchError.set(errorMessage(e, 'No fue posible consultar la disponibilidad.'));
        },
      });
  }

  confirmBooking() {
    const slot = this.selectedSlot();
    const specialty = this.selectedSpecialty();
    // Evita doble envío: un solo POST por confirmación.
    if (!slot || !specialty || this.bookingLoading()) return;
    this.bookingLoading.set(true);
    this.bookingError.set(null);
    const reason = this.reason().trim();
    const base = {
      professionalId: slot.professionalId,
      locationCode: slot.locationCode,
      startAt: slot.startAt,
      ...(reason ? { reason } : {}),
    };
    const request$ = specialty.general
      ? this.availability.bookGeneral(base)
      : this.availability.bookSpecialized({ ...base, specialtyId: specialty.id });
    request$.subscribe({
      next: (appointment) => {
        this.bookingLoading.set(false);
        this.booked.set(appointment);
        this.portalService.loadAppointments();
      },
      error: (e: unknown) => {
        this.bookingLoading.set(false);
        if (errorCode(e) === 'SLOT_UNAVAILABLE') {
          // El backend es la autoridad: se descarta la selección y se recarga la disponibilidad.
          this.bookingError.set(null);
          this.selectedKey.set(null);
          this.searchError.set(null);
          this.slotTakenMessage.set(SLOT_TAKEN_MESSAGE);
          this.search(true);
          return;
        }
        this.bookingError.set(errorMessage(e, 'No fue posible agendar la cita.'));
      },
    });
  }

  finishAndGoDashboard() {
    this.booked.set(null);
    void this.router.navigate(['/inicio']);
  }

  goBack() {
    void this.router.navigate(['/inicio']);
  }
}
