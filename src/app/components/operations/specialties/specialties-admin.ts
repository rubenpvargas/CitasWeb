import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminApi, SPECIALTY_DURATIONS, SpecialtyDto } from '../../../core/api/admin.api';
import { errorMessage } from '../../../core/api/api-errors';

/**
 * HU-009: especialidades (ADMIN). Duración restringida a 30/60 en la UI; el
 * servidor sigue siendo la autoridad (400 VALIDATION_ERROR, 409
 * GENERAL_SPECIALTY_CONFLICT). Sin borrado físico.
 */
@Component({
  selector: 'app-specialties-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="grid md:grid-cols-[1fr_1.4fr] gap-5">
      <section class="ui-card flex flex-col gap-4" aria-labelledby="spec-form-title">
        <h2 id="spec-form-title" class="ui-section-title">Nueva especialidad</h2>
        <form [formGroup]="form" (ngSubmit)="create()" novalidate class="flex flex-col gap-3" data-testid="spec-form" [attr.aria-busy]="saving()">
          <div class="flex flex-col gap-1">
            <label for="spec-code" class="ui-label">Código *</label>
            <input id="spec-code" class="ui-input" formControlName="code" maxlength="40" placeholder="CARDIO" [attr.aria-invalid]="invalid('code')" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="spec-name" class="ui-label">Nombre *</label>
            <input id="spec-name" class="ui-input" formControlName="name" maxlength="160" placeholder="Cardiología" [attr.aria-invalid]="invalid('name')" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="spec-duration" class="ui-label">Duración de la cita *</label>
            <select id="spec-duration" class="ui-input" formControlName="durationMinutes">
              @for (d of durations; track d) { <option [ngValue]="d">{{ d }} minutos</option> }
            </select>
          </div>
          <label class="flex items-start gap-2 text-[13px] text-on-surface-variant cursor-pointer">
            <input type="checkbox" formControlName="general" class="w-4 h-4 mt-0.5 accent-[#0A3663]" aria-describedby="spec-general-help" />
            <span>Especialidad general (medicina general, sin aprobación administrativa)</span>
          </label>
          <p id="spec-general-help" class="text-[11px] text-on-surface-variant -mt-2">Solo puede existir una especialidad general activa.</p>
          <button type="submit" class="ui-btn-primary" data-testid="spec-create" [disabled]="saving()">{{ saving() ? 'Guardando...' : 'Crear especialidad' }}</button>
        </form>
      </section>

      <section class="ui-card flex flex-col gap-3" aria-labelledby="spec-list-title">
        <div class="flex items-center justify-between">
          <h2 id="spec-list-title" class="ui-section-title">Especialidades</h2>
          <button type="button" class="ui-btn-ghost" (click)="load()" [disabled]="loading()">Actualizar</button>
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (error()) { <p class="ui-alert-error" data-testid="spec-error">{{ error() }}</p> }
        </div>
        <div role="status" aria-live="polite">
          @if (loading()) { <p class="ui-empty">Cargando especialidades...</p> }
          @if (message()) { <p class="ui-alert-success">{{ message() }}</p> }
        </div>
        @if (!loading()) {
          <ul class="flex flex-col gap-2" aria-label="Especialidades registradas">
            @for (s of specialties(); track s.id) {
              <li class="ui-row flex-wrap">
                @if (editingId() === s.id) {
                  <label class="sr-only" [for]="'spec-edit-name-' + s.id">Nombre de {{ s.code }}</label>
                  <input [id]="'spec-edit-name-' + s.id" class="ui-input flex-1 min-w-40" [value]="s.name" #editName maxlength="160" />
                  <label class="sr-only" [for]="'spec-edit-duration-' + s.id">Duración de {{ s.code }}</label>
                  <select [id]="'spec-edit-duration-' + s.id" class="ui-input w-32" #editDuration>
                    @for (d of durations; track d) { <option [value]="d" [selected]="d === s.durationMinutes">{{ d }} min</option> }
                  </select>
                  <button type="button" class="ui-btn-ghost" (click)="saveEdit(s, editName.value, editDuration.value)">Guardar</button>
                  <button type="button" class="ui-btn-ghost" (click)="editingId.set(null)">Cancelar</button>
                } @else {
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-semibold text-on-surface truncate">{{ s.name }}</p>
                    <p class="text-[11px] text-on-surface-variant">{{ s.code }} · {{ s.durationMinutes }} min</p>
                  </div>
                  @if (s.general) { <span class="ui-badge bg-tertiary-fixed text-tertiary-container">General</span> }
                  <span class="ui-badge" [class]="s.active ? 'bg-secondary-container/30 text-primary' : 'bg-surface-container-high text-on-surface-variant'">{{ s.active ? 'Activa' : 'Inactiva' }}</span>
                  <button type="button" class="ui-btn-ghost" (click)="editingId.set(s.id)">Editar</button>
                  <button type="button" class="ui-btn-ghost" [attr.data-testid]="'spec-toggle-' + s.id" (click)="toggle(s)">{{ s.active ? 'Desactivar' : 'Activar' }}</button>
                }
              </li>
            } @empty {
              @if (!error()) { <li class="ui-empty" data-testid="spec-empty">No hay especialidades registradas.</li> }
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class SpecialtiesAdminComponent {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);

  readonly durations = SPECIALTY_DURATIONS;
  readonly specialties = signal<SpecialtyDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal('');
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    durationMinutes: [30 as number, [Validators.required]],
    general: [false],
  });

  constructor() {
    this.load();
  }

  invalid(name: 'code' | 'name'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listSpecialties().subscribe({
      next: (list) => {
        this.specialties.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'No fue posible cargar las especialidades.'));
        this.loading.set(false);
      },
    });
  }

  create() {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Ingresa el código y el nombre de la especialidad.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.message.set('');
    this.api
      .createSpecialty({ code: v.code.trim(), name: v.name.trim(), durationMinutes: Number(v.durationMinutes), general: v.general })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.form.reset();
          this.specialties.update((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
          this.message.set(`Especialidad "${created.name}" creada.`);
        },
        error: (e: unknown) => {
          this.saving.set(false);
          this.error.set(errorMessage(e, 'No fue posible crear la especialidad.'));
        },
      });
  }

  private patch(s: SpecialtyDto, name: string, durationMinutes: number, active: boolean, success: string) {
    this.error.set(null);
    this.message.set('');
    this.api.updateSpecialty(s.id, { name, durationMinutes, active }).subscribe({
      next: (updated) => {
        this.specialties.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.editingId.set(null);
        this.message.set(success);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'No fue posible actualizar la especialidad.')),
    });
  }

  saveEdit(s: SpecialtyDto, name: string, duration: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      this.error.set('El nombre de la especialidad es obligatorio.');
      return;
    }
    this.patch(s, trimmed, Number(duration), s.active, 'Especialidad actualizada. La duración aplica a nuevas reservas.');
  }

  toggle(s: SpecialtyDto) {
    this.patch(s, s.name, s.durationMinutes, !s.active, s.active ? `"${s.name}" desactivada.` : `"${s.name}" activada.`);
  }
}
