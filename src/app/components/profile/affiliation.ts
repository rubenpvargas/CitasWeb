import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AffiliationDto, InsuranceEpsDto, ProfileApi } from '../../core/api/profile.api';
import { errorCode, errorMessage } from '../../core/api/api-errors';

/**
 * HU-006: afiliación del USER. Selector EPS → plan (filtrado por EPS) →
 * número de afiliación → `PUT /me/affiliations`. Ante error se conserva y
 * muestra la afiliación previa (el backend garantiza la transacción).
 */
@Component({
  selector: 'app-affiliation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <section class="ui-card flex flex-col gap-3" aria-labelledby="affiliation-title" [attr.aria-busy]="loading() || saving()">
      <h3 id="affiliation-title" class="ui-section-title">Afiliación en salud</h3>

      <div role="status" aria-live="polite">
        @if (loading()) {
          <p class="ui-empty flex items-center justify-center gap-2" data-testid="affiliation-loading">
            <span class="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
            Cargando afiliación...
          </p>
        }
        @if (success()) {
          <p class="ui-alert-success" data-testid="affiliation-success">
            <span class="material-symbols-outlined text-secondary text-[18px]" aria-hidden="true">check_circle</span>
            Afiliación actualizada correctamente.
          </p>
        }
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true">
        @if (error()) {
          <p class="ui-alert-error" data-testid="affiliation-error">
            <span class="material-symbols-outlined text-error text-[18px]" aria-hidden="true">error</span>
            {{ error() }}
          </p>
        }
      </div>

      @if (!loading()) {
        @if (current(); as a) {
          <div class="ui-row" data-testid="affiliation-current">
            <span class="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">health_and_safety</span>
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] text-on-surface-variant">Afiliación vigente</span>
              <span class="text-[13px] font-semibold text-on-surface">{{ a.epsName }} · {{ a.planName }}</span>
              <span class="text-[12px] text-on-surface-variant">Régimen {{ a.regimeName }} · N.º {{ a.membershipNumber }}</span>
            </div>
          </div>
        } @else if (loadedAffiliations()) {
          <p class="ui-empty" data-testid="affiliation-none">Aún no registras una afiliación en salud.</p>
        }

        @if (epsList().length === 0 && loadedEps()) {
          <p class="ui-empty" data-testid="affiliation-no-eps">No hay EPS disponibles en este momento.</p>
        } @else if (loadedEps()) {
          <form [formGroup]="form" (ngSubmit)="save()" novalidate class="flex flex-col gap-3" data-testid="affiliation-form">
            <div class="flex flex-col gap-1.5">
              <label for="aff-eps" class="ui-label">EPS *</label>
              <select id="aff-eps" class="ui-input" formControlName="epsId" (change)="onEpsChange()" [attr.aria-invalid]="invalid('epsId')">
                <option [ngValue]="null">Selecciona tu EPS…</option>
                @for (eps of epsList(); track eps.id) { <option [ngValue]="eps.id">{{ eps.name }}</option> }
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="aff-plan" class="ui-label">Plan *</label>
              <select id="aff-plan" class="ui-input" formControlName="planId" [attr.aria-invalid]="invalid('planId')" aria-describedby="aff-plan-help">
                <option [ngValue]="null">{{ selectedEpsId() ? 'Selecciona el plan…' : 'Primero elige una EPS' }}</option>
                @for (plan of plans(); track plan.id) { <option [ngValue]="plan.id">{{ plan.name }} ({{ plan.regime.name }})</option> }
              </select>
              @if (selectedEpsId() && plans().length === 0) {
                <span id="aff-plan-help" class="ui-field-error">Esta EPS no tiene planes activos.</span>
              }
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="aff-number" class="ui-label">Número de afiliación *</label>
              <input id="aff-number" class="ui-input" formControlName="membershipNumber" maxlength="80" placeholder="Ej. SYN-000123"
                [attr.aria-invalid]="invalid('membershipNumber')" [attr.aria-describedby]="invalid('membershipNumber') ? 'aff-number-error' : null" />
              @if (invalid('membershipNumber')) { <span id="aff-number-error" class="ui-field-error">Ingresa el número de afiliación (máximo 80 caracteres).</span> }
            </div>
            <button type="submit" class="ui-btn-primary" data-testid="affiliation-save" [disabled]="saving()">
              @if (saving()) {
                <span class="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
                <span>Guardando afiliación...</span>
              } @else {
                <span>{{ current() ? 'Actualizar afiliación' : 'Registrar afiliación' }}</span>
              }
            </button>
          </form>
        }
      }
    </section>
  `,
})
export class AffiliationComponent {
  private readonly api = inject(ProfileApi);
  private readonly fb = inject(FormBuilder);

  readonly affiliations = signal<AffiliationDto[]>([]);
  readonly epsList = signal<InsuranceEpsDto[]>([]);
  readonly loading = signal(true);
  readonly loadedAffiliations = signal(false);
  readonly loadedEps = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly form = this.fb.group({
    epsId: this.fb.control<number | null>(null, Validators.required),
    planId: this.fb.control<number | null>(null, Validators.required),
    membershipNumber: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(80)]),
  });

  readonly selectedEpsId = toSignal(this.form.controls.epsId.valueChanges, { initialValue: null as number | null });
  readonly current = computed(() => this.affiliations().find((a) => a.current) ?? null);
  readonly plans = computed(() => this.epsList().find((e) => e.id === this.selectedEpsId())?.plans ?? []);

  constructor() {
    this.load();
  }

  invalid(name: 'epsId' | 'planId' | 'membershipNumber'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  load() {
    this.loading.set(true);
    forkJoin({ affiliations: this.api.getAffiliations(), eps: this.api.listInsuranceEps() }).subscribe({
      next: ({ affiliations, eps }) => {
        this.affiliations.set(affiliations ?? []);
        this.epsList.set(eps ?? []);
        this.loadedAffiliations.set(true);
        this.loadedEps.set(true);
        this.loading.set(false);
        this.prefill();
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e, 'No fue posible cargar la información de afiliación.'));
        this.loading.set(false);
      },
    });
  }

  private prefill() {
    const a = this.current();
    if (!a || !this.epsList().some((e) => e.id === a.epsId)) return;
    this.form.reset({ epsId: a.epsId, planId: a.planId, membershipNumber: a.membershipNumber });
  }

  onEpsChange() {
    this.form.controls.planId.setValue(null);
  }

  save() {
    if (this.saving()) return;
    this.success.set(false);
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || v.planId === null) {
      this.error.set('Selecciona EPS y plan e ingresa tu número de afiliación.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.saveAffiliation({ planId: v.planId, membershipNumber: v.membershipNumber.trim() }).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.success.set(true);
        if (saved && typeof saved.planId === 'number') {
          const updated = { ...saved, current: true };
          this.affiliations.update((list) => [updated, ...list.filter((a) => a.id !== saved.id).map((a) => ({ ...a, current: false }))]);
        } else {
          this.api.getAffiliations().subscribe({ next: (list) => this.affiliations.set(list ?? []) });
        }
      },
      error: (e: unknown) => {
        this.saving.set(false);
        // La afiliación previa se conserva en pantalla (no se modifica `affiliations`).
        if (errorCode(e) === 'CATALOG_INACTIVE') {
          this.error.set('El plan o la EPS seleccionados ya no están activos. Tu afiliación anterior se conserva; elige otra opción.');
          this.api.listInsuranceEps().subscribe({ next: (eps) => this.epsList.set(eps ?? []) });
          this.form.controls.planId.setValue(null);
        } else {
          this.error.set(errorMessage(e, 'No fue posible guardar la afiliación. Tu afiliación anterior se conserva.'));
        }
      },
    });
  }
}
