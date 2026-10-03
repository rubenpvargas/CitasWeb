import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { AdminApi, LocationDto, ProfessionalDto, SpecialtyDto, codeList } from '../../../core/api/admin.api';
import { errorMessage } from '../../../core/api/api-errors';

/**
 * HU-011: capacidades de un profesional. Multi-selección de especialidades y
 * sedes, especialidad principal limitada a las asignadas y estado activo.
 * El backend valida (409 PRIMARY_NOT_ASSIGNED, CATALOG_INACTIVE, 404).
 */
@Component({
  selector: 'app-capabilities-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-3 pt-2 border-t border-outline-variant/30" [attr.aria-busy]="saving()" data-testid="cap-form"
      [attr.aria-label]="'Capacidades de ' + professional().firstName + ' ' + professional().lastName">
      <fieldset class="flex flex-col gap-1.5">
        <legend class="ui-label mb-1">Especialidades asignadas *</legend>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
          @for (s of specialties(); track s.id) {
            <label class="flex items-center gap-2 text-[13px] cursor-pointer" [class.text-outline]="!s.active">
              <input type="checkbox" class="w-4 h-4 accent-[#0A3663]" [checked]="specialtyIds().includes(s.id)"
                [disabled]="!s.active && !specialtyIds().includes(s.id)" (change)="toggleSpecialty(s.id)"
                [attr.data-testid]="'cap-spec-' + s.id" />
              {{ s.name }}{{ s.active ? '' : ' (inactiva)' }}
            </label>
          }
        </div>
      </fieldset>

      <div class="flex flex-col gap-1">
        <label [for]="'cap-primary-' + professional().id" class="ui-label">Especialidad principal *</label>
        <select [id]="'cap-primary-' + professional().id" class="ui-input" data-testid="cap-primary" [value]="primaryId() ?? ''" (change)="setPrimary($any($event.target).value)"
          [disabled]="assignedSpecialties().length === 0" aria-describedby="cap-primary-help">
          <option value="">{{ assignedSpecialties().length ? 'Selecciona la principal…' : 'Asigna primero especialidades' }}</option>
          @for (s of assignedSpecialties(); track s.id) {
            <option [value]="s.id" [selected]="s.id === primaryId()">{{ s.name }}</option>
          }
        </select>
        <span id="cap-primary-help" class="text-[11px] text-on-surface-variant">Solo puede elegirse entre las especialidades asignadas.</span>
      </div>

      <fieldset class="flex flex-col gap-1.5">
        <legend class="ui-label mb-1">Sedes asignadas *</legend>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
          @for (l of locations(); track l.id) {
            <label class="flex items-center gap-2 text-[13px] cursor-pointer" [class.text-outline]="!l.active">
              <input type="checkbox" class="w-4 h-4 accent-[#0A3663]" [checked]="locationIds().includes(l.id)"
                [disabled]="!l.active && !locationIds().includes(l.id)" (change)="toggleLocation(l.id)"
                [attr.data-testid]="'cap-loc-' + l.id" />
              {{ l.name }}{{ l.active ? '' : ' (inactiva)' }}
            </label>
          }
        </div>
      </fieldset>

      <label class="flex items-center gap-2 text-[13px] cursor-pointer">
        <input type="checkbox" class="w-4 h-4 accent-[#0A3663]" [checked]="active()" (change)="active.set(!active())" data-testid="cap-active" />
        Profesional activo (puede publicar bloques y recibir reservas)
      </label>

      <div role="alert" aria-live="assertive" aria-atomic="true">
        @if (error()) { <p class="ui-alert-error" data-testid="cap-error">{{ error() }}</p> }
      </div>

      <div class="flex gap-2">
        <button type="submit" class="ui-btn-primary flex-1" data-testid="cap-save" [disabled]="saving()">{{ saving() ? 'Guardando...' : 'Guardar capacidades' }}</button>
        <button type="button" class="ui-btn-secondary" (click)="cancelled.emit()" [disabled]="saving()">Cancelar</button>
      </div>
    </form>
  `,
})
export class CapabilitiesEditorComponent implements OnInit {
  private readonly api = inject(AdminApi);

  readonly professional = input.required<ProfessionalDto>();
  readonly specialties = input.required<SpecialtyDto[]>();
  readonly locations = input.required<LocationDto[]>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly specialtyIds = signal<number[]>([]);
  readonly locationIds = signal<number[]>([]);
  readonly primaryId = signal<number | null>(null);
  readonly active = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly assignedSpecialties = computed(() => this.specialties().filter((s) => this.specialtyIds().includes(s.id)));

  ngOnInit() {
    const p = this.professional();
    const specCodes = codeList(p.specialtyCodes);
    const locCodes = codeList(p.locationCodes);
    this.specialtyIds.set(p.specialtyIds ?? this.specialties().filter((s) => specCodes.includes(s.code)).map((s) => s.id));
    this.locationIds.set(p.locationIds ?? this.locations().filter((l) => locCodes.includes(l.code)).map((l) => l.id));
    const primary = p.primarySpecialtyId ?? null;
    this.primaryId.set(primary !== null && this.specialtyIds().includes(primary) ? primary : null);
    this.active.set(p.active);
  }

  toggleSpecialty(id: number) {
    this.specialtyIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    if (this.primaryId() !== null && !this.specialtyIds().includes(this.primaryId() as number)) this.primaryId.set(null);
  }

  toggleLocation(id: number) {
    this.locationIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  setPrimary(value: string) {
    this.primaryId.set(value ? Number(value) : null);
  }

  save() {
    if (this.saving()) return;
    const primary = this.primaryId();
    if (this.specialtyIds().length === 0 || this.locationIds().length === 0 || primary === null) {
      this.error.set('Asigna al menos una especialidad, una sede y elige la especialidad principal.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .updateCapabilities(this.professional().id, {
        specialtyIds: this.specialtyIds(),
        primarySpecialtyId: primary,
        locationIds: this.locationIds(),
        active: this.active(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (e: unknown) => {
          this.saving.set(false);
          this.error.set(errorMessage(e, 'No fue posible guardar las capacidades.'));
        },
      });
  }
}
