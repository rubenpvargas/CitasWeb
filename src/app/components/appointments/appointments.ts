import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentsApi } from '../../core/api/appointments.api';
import { AppointmentDto } from '../../core/api/availability.api';
import { APPOINTMENT_STATUS_LABELS, appointmentStatusLabel } from '../../core/api/appointment-status';
import { errorMessage } from '../../core/api/api-errors';
import { MAX_RANGE_DAYS, dateOf, daysBetween, formatLongDate, timeOf } from '../../core/time/bogota-time';

/** Clases del distintivo por estado (paleta del diseño aprobado). */
export const STATUS_BADGE: Record<string, string> = {
  REQUESTED: 'bg-surface-container-high text-primary border-outline-variant/40',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-error-container text-error border-[#fecdd3]',
  CANCELLED: 'bg-error-container text-error border-[#fecdd3]',
  COMPLETED: 'bg-surface-container text-on-surface-variant border-outline-variant/40',
  NO_SHOW: 'bg-surface-container text-on-surface-variant border-outline-variant/40',
};

/**
 * HU-019: "Mis citas" con datos reales (`GET /appointments?status&from&to`).
 * Etiquetas por estado, motivo de rechazo, reprogramación pendiente y las
 * banderas `cancellable`/`reschedulable` calculadas por el backend.
 */
@Component({
  selector: 'app-appointments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-primary-container text-white flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">calendar_month</span>
          </div>
          <div class="flex flex-col">
            <h1 class="text-[15px] font-semibold text-primary tracking-tight leading-none m-0">Mis Citas Médicas</h1>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">Gestión y Seguimiento</span>
          </div>
        </div>
        <button
          type="button"
          (click)="goToBooking()"
          class="flex items-center gap-1 bg-primary-container text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg hover:bg-primary transition-colors cursor-pointer border-0"
        >
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
          <span>Nueva</span>
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-3 pb-28 bg-surface">
      <div class="flex flex-col w-full gap-4">

        <!-- Filtros -->
        <form (submit)="$event.preventDefault(); load()" class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 grid grid-cols-2 gap-2" data-testid="appointments-filters" aria-label="Filtrar citas">
          <div class="flex flex-col gap-1 col-span-2">
            <label for="ap-status" class="text-[12px] text-on-surface-variant font-medium">Estado</label>
            <select id="ap-status" class="ui-input" (change)="status.set($any($event.target).value)">
              <option value="">Todos los estados</option>
              @for (s of statusOptions; track s.code) { <option [value]="s.code">{{ s.label }}</option> }
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label for="ap-from" class="text-[12px] text-on-surface-variant font-medium">Desde</label>
            <input id="ap-from" type="date" class="ui-input" [value]="from()" (change)="from.set($any($event.target).value)" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="ap-to" class="text-[12px] text-on-surface-variant font-medium">Hasta</label>
            <input id="ap-to" type="date" class="ui-input" [value]="to()" (change)="to.set($any($event.target).value)" />
          </div>
          <button type="submit" class="ui-btn-secondary col-span-2" data-testid="appointments-apply" [disabled]="loading()">Aplicar filtros</button>
        </form>

        <div role="status" aria-live="polite">
          @if (loading()) { <p class="ui-empty" data-testid="appointments-loading">Cargando tus citas...</p> }
          @if (message()) { <p class="ui-alert-success" data-testid="appointments-message">{{ message() }}</p> }
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (error()) { <p class="ui-alert-error" data-testid="appointments-error">{{ error() }}</p> }
        </div>

        <!-- Lista de Citas -->
        @if (!loading() && !error()) {
          <ul class="flex flex-col gap-3" aria-label="Citas">
            @for (cita of appointments(); track cita.id) {
              <li class="rounded-2xl bg-surface-container-lowest shadow-xs p-4 flex flex-col gap-3 border border-outline-variant/40" [attr.data-testid]="'appointment-' + cita.id">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border" [class]="badge(cita.status)" [attr.data-testid]="'status-' + cita.id">
                        {{ label(cita.status) }}
                      </span>
                      <span class="text-[11px] text-on-surface-variant">· N.º {{ cita.id }}</span>
                    </div>
                    <h2 class="text-[15px] font-semibold text-primary truncate m-0">{{ cita.specialtyName }}</h2>
                    <p class="text-[13px] text-on-surface-variant">{{ cita.professionalName }}</p>
                  </div>
                  <div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[20px]" aria-hidden="true">event</span>
                  </div>
                </div>

                <div class="bg-surface-container-low/70 p-3 rounded-xl flex flex-col gap-1 text-[12px] border border-outline-variant/20">
                  <div class="flex items-center gap-1.5 font-semibold text-primary">
                    <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">calendar_today</span>
                    <span class="capitalize">{{ longDate(cita.startAt) }} · {{ time(cita.startAt) }}–{{ time(cita.endAt) }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 text-on-surface-variant pt-0.5">
                    <span class="material-symbols-outlined text-[16px] text-outline shrink-0" aria-hidden="true">location_on</span>
                    <span>{{ cita.locationName || cita.locationCode }}</span>
                  </div>
                  @if (cita.reason) {
                    <p class="text-on-surface-variant pt-0.5"><strong>Motivo:</strong> {{ cita.reason }}</p>
                  }
                </div>

                @if (cita.status === 'REJECTED' && cita.rejectionReason) {
                  <p class="ui-alert-error" [attr.data-testid]="'rejection-' + cita.id">
                    <span class="material-symbols-outlined text-error text-[18px]" aria-hidden="true">info</span>
                    <span><strong>Motivo del rechazo:</strong> {{ cita.rejectionReason }}</span>
                  </p>
                }
                @if (cita.status === 'REQUESTED') {
                  <p class="text-[12px] text-on-surface-variant flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">hourglass_top</span>
                    Pendiente de aprobación administrativa; el horario está reservado para ti.
                  </p>
                }
                @if (cita.pendingReschedule; as r) {
                  <p class="text-[12px] text-primary flex items-center gap-1.5 p-2 rounded-lg bg-surface-container" [attr.data-testid]="'pending-reschedule-' + cita.id">
                    <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">update</span>
                    Reprogramación solicitada para {{ longDate(r.requestedStartAt) }} a las {{ time(r.requestedStartAt) }} ({{ r.locationCode }}), pendiente de aprobación.
                  </p>
                }
              </li>
            } @empty {
              <li class="rounded-2xl bg-surface-container-lowest shadow-xs p-8 flex flex-col items-center text-center gap-2 border border-outline-variant/30" data-testid="appointments-empty">
                <span class="material-symbols-outlined text-[36px] text-outline" aria-hidden="true">event_busy</span>
                <p class="text-base font-semibold text-primary">No hay citas con estos filtros</p>
                <p class="text-[13px] text-on-surface-variant max-w-xs">Puedes programar una cita con nuestros especialistas en pocos minutos.</p>
                <button type="button" (click)="goToBooking()" class="mt-2 px-4 py-2 rounded-lg bg-primary-container text-white text-[13px] font-semibold cursor-pointer border-0">
                  Agendar consulta ahora
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </main>
  `,
})
export class AppointmentsComponent {
  protected readonly api = inject(AppointmentsApi);
  private readonly router = inject(Router);

  readonly statusOptions = Object.entries(APPOINTMENT_STATUS_LABELS).map(([code, label]) => ({ code, label }));
  readonly status = signal('');
  readonly from = signal('');
  readonly to = signal('');

  readonly appointments = signal<AppointmentDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');

  constructor() {
    this.load();
  }

  label(status: string): string {
    return appointmentStatusLabel(status);
  }

  badge(status: string): string {
    return STATUS_BADGE[status] ?? STATUS_BADGE['COMPLETED'];
  }

  longDate(value: string): string {
    return formatLongDate(dateOf(value));
  }

  time(value: string): string {
    return timeOf(value);
  }

  load() {
    const from = this.from();
    const to = this.to();
    if ((from && !to) || (!from && to)) {
      this.error.set('Indica ambas fechas del rango o ninguna.');
      return;
    }
    if (from && to) {
      const span = daysBetween(from, to);
      if (span < 0) {
        this.error.set('La fecha inicial debe ser anterior o igual a la final.');
        return;
      }
      if (span > MAX_RANGE_DAYS) {
        this.error.set(`El rango no puede superar ${MAX_RANGE_DAYS} días.`);
        return;
      }
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ status: this.status() || null, from: from || null, to: to || null }).subscribe({
      next: (list) => {
        this.appointments.set([...list].sort((a, b) => b.startAt.localeCompare(a.startAt)));
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'No fue posible cargar tus citas.'));
        this.loading.set(false);
      },
    });
  }

  goToBooking() {
    void this.router.navigate(['/reservar']);
  }
}
