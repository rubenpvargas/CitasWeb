import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi, InboxItemDto } from '../../../core/api/admin.api';
import { errorCode, errorMessage } from '../../../core/api/api-errors';
import { formatShortDate, timeOf, dateOf } from '../../../core/time/bogota-time';

export const REASON_MAX = 500;

type Mode = 'approve' | 'reject';

/**
 * HU-018: bandeja ADMIN de solicitudes pendientes. Aprobar pide confirmación;
 * rechazar exige un motivo escrito (validación de UX; el backend responde
 * 409 REJECTION_REASON_REQUIRED / INVALID_TRANSITION).
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
        @if (message()) { <p class="ui-alert-success" data-testid="inbox-message">{{ message() }}</p> }
      </div>
      <div role="alert" aria-live="assertive">
        @if (error()) { <p class="ui-alert-error" data-testid="inbox-error">{{ error() }}</p> }
      </div>
      @if (!loading()) {
        @for (item of items(); track itemKey(item)) {
          <article class="ui-card flex flex-col gap-3" [attr.data-testid]="'inbox-' + itemKey(item)" [attr.aria-labelledby]="'inbox-title-' + itemKey(item)">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 [id]="'inbox-title-' + itemKey(item)" class="text-[14px] font-semibold text-primary m-0">
                  {{ item.itemType === 'RESCHEDULE' ? 'Reprogramación' : 'Cita especializada' }} #{{ item.id }}
                </h3>
                <p class="text-sm text-on-surface-variant">
                  {{ item.specialtyName }} · {{ when(item.startAt) }} · {{ item.locationCode }}
                  @if (item.patientFirstName) { · {{ item.patientFirstName }} {{ item.patientLastName }} }
                </p>
                <span class="ui-badge bg-surface-container-high text-primary mt-1">Pendiente</span>
              </div>
              @if (activeKey() !== itemKey(item)) {
                <div class="flex gap-2">
                  <button type="button" (click)="open(item, 'approve')" [attr.data-testid]="'approve-' + itemKey(item)"
                    class="px-3 py-2 rounded-lg bg-emerald-700 text-white border-0 cursor-pointer">Aprobar</button>
                  <button type="button" (click)="open(item, 'reject')" [attr.data-testid]="'reject-' + itemKey(item)"
                    class="px-3 py-2 rounded-lg bg-error text-white border-0 cursor-pointer">Rechazar</button>
                </div>
              }
            </div>

            @if (activeKey() === itemKey(item)) {
              <form (submit)="$event.preventDefault(); submit(item)" novalidate class="flex flex-col gap-2 pt-2 border-t border-outline-variant/30"
                [attr.aria-busy]="deciding()" [attr.data-testid]="'decision-' + itemKey(item)">
                @if (mode() === 'approve') {
                  <p class="text-[13px] text-on-surface">¿Confirmas la aprobación de esta solicitud? El horario quedará asignado al paciente.</p>
                } @else {
                  <label [for]="'reason-' + itemKey(item)" class="ui-label">Motivo del rechazo *</label>
                  <textarea [id]="'reason-' + itemKey(item)" rows="3" [attr.maxlength]="reasonMax" class="ui-input h-auto py-2"
                    data-testid="reject-reason" [value]="reason()" (input)="reason.set($any($event.target).value)"
                    [attr.aria-invalid]="!!reasonError()" [attr.aria-describedby]="reasonError() ? 'reason-error-' + itemKey(item) : null"
                    placeholder="Explica al paciente por qué se rechaza (se registrará en el historial)"></textarea>
                  @if (reasonError()) { <span [id]="'reason-error-' + itemKey(item)" class="ui-field-error">{{ reasonError() }}</span> }
                }
                @if (decisionError()) { <p class="ui-alert-error" role="alert" data-testid="decision-error">{{ decisionError() }}</p> }
                <div class="flex gap-2">
                  <button type="submit" data-testid="decision-confirm" [disabled]="deciding()"
                    class="px-3 py-2 rounded-lg text-white border-0 cursor-pointer disabled:opacity-60" [class]="mode() === 'approve' ? 'bg-emerald-700' : 'bg-error'">
                    {{ deciding() ? 'Guardando decisión...' : mode() === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo' }}
                  </button>
                  <button type="button" class="ui-btn-ghost" (click)="close()" [disabled]="deciding()">Cancelar</button>
                </div>
              </form>
            }
          </article>
        } @empty {
          @if (!error()) { <p class="ui-empty" data-testid="inbox-empty">No hay solicitudes pendientes.</p> }
        }
      }
    </section>
  `,
})
export class InboxComponent {
  private readonly api = inject(AdminApi);
  readonly reasonMax = REASON_MAX;
  readonly items = signal<InboxItemDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');

  readonly activeKey = signal<string | null>(null);
  readonly mode = signal<Mode>('approve');
  readonly reason = signal('');
  readonly reasonError = signal<string | null>(null);
  readonly decisionError = signal<string | null>(null);
  readonly deciding = signal(false);

  constructor() {
    this.load();
  }

  itemKey(item: InboxItemDto): string {
    return `${item.itemType}-${item.id}`;
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

  open(item: InboxItemDto, mode: Mode) {
    this.activeKey.set(this.itemKey(item));
    this.mode.set(mode);
    this.reason.set('');
    this.reasonError.set(null);
    this.decisionError.set(null);
    this.message.set('');
  }

  close() {
    this.activeKey.set(null);
  }

  submit(item: InboxItemDto) {
    if (this.deciding()) return;
    const approve = this.mode() === 'approve';
    const reason = this.reason().trim();
    if (!approve && !reason) {
      this.reasonError.set('Escribe el motivo del rechazo.');
      return;
    }
    if (reason.length > REASON_MAX) {
      this.reasonError.set(`El motivo no puede superar ${REASON_MAX} caracteres.`);
      return;
    }
    this.reasonError.set(null);
    this.decisionError.set(null);
    this.deciding.set(true);
    this.api.decide(item, approve, approve ? null : reason).subscribe({
      next: () => {
        this.deciding.set(false);
        this.activeKey.set(null);
        this.message.set(`${approve ? 'Aprobada' : 'Rechazada'} la solicitud #${item.id}.`);
        this.load();
      },
      error: (e: unknown) => {
        this.deciding.set(false);
        const code = errorCode(e);
        this.decisionError.set(errorMessage(e, 'La API rechazó la decisión.'));
        if (code === 'INVALID_TRANSITION' || code === 'NOT_FOUND') {
          // La solicitud ya cambió en el servidor: se refresca la bandeja conservando el aviso.
          this.activeKey.set(null);
          this.error.set(this.decisionError());
          this.api.listInbox().subscribe({ next: (items) => this.items.set(items), error: () => undefined });
        }
      },
    });
  }
}
