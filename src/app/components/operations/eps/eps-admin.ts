import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminApi, EpsDto, PlanDto } from '../../../core/api/admin.api';
import { CatalogApi, CatalogEntryDto } from '../../../core/api/catalog.api';
import { errorMessage } from '../../../core/api/api-errors';

export interface RegimeOption {
  code: string;
  name: string;
  id: number | null;
}

/**
 * HU-008: EPS y planes (ADMIN). Lista incluye inactivas; sin borrado físico
 * (retirar = desactivar). Los regímenes provienen de `GET /catalogs`.
 */
@Component({
  selector: 'app-eps-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="grid md:grid-cols-[1fr_1.2fr] gap-5">
      <!-- EPS -->
      <section class="ui-card flex flex-col gap-4" aria-labelledby="eps-title">
        <h2 id="eps-title" class="ui-section-title">EPS</h2>

        <form [formGroup]="epsForm" (ngSubmit)="createEps()" novalidate class="flex flex-col gap-3" data-testid="eps-form" [attr.aria-busy]="savingEps()">
          <div class="grid grid-cols-[0.8fr_1.2fr] gap-2">
            <div class="flex flex-col gap-1">
              <label for="eps-code" class="ui-label">Código *</label>
              <input id="eps-code" class="ui-input" formControlName="code" maxlength="40" placeholder="EPS_SINTETICA"
                [attr.aria-invalid]="invalid(epsForm.controls.code)" />
            </div>
            <div class="flex flex-col gap-1">
              <label for="eps-name" class="ui-label">Nombre *</label>
              <input id="eps-name" class="ui-input" formControlName="name" maxlength="160" placeholder="EPS Sintética S.A."
                [attr.aria-invalid]="invalid(epsForm.controls.name)" />
            </div>
          </div>
          <button type="submit" class="ui-btn-primary" data-testid="eps-create" [disabled]="savingEps()">
            {{ savingEps() ? 'Guardando...' : 'Crear EPS' }}
          </button>
        </form>

        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (epsError()) { <p class="ui-alert-error" data-testid="eps-error">{{ epsError() }}</p> }
        </div>
        <div role="status" aria-live="polite">
          @if (loadingEps()) { <p class="ui-empty">Cargando EPS...</p> }
          @if (epsMessage()) { <p class="ui-alert-success">{{ epsMessage() }}</p> }
        </div>

        @if (!loadingEps()) {
          <ul class="flex flex-col gap-2" aria-label="EPS registradas">
            @for (eps of epsList(); track eps.id) {
              <li class="ui-row flex-wrap" [class.ring-2]="selected()?.id === eps.id" [class.ring-secondary]="selected()?.id === eps.id">
                @if (editingEpsId() === eps.id) {
                  <label class="sr-only" [for]="'eps-edit-' + eps.id">Nombre de {{ eps.code }}</label>
                  <input [id]="'eps-edit-' + eps.id" class="ui-input flex-1 min-w-40" [value]="eps.name" #nameInput maxlength="160" />
                  <button type="button" class="ui-btn-ghost" (click)="saveEpsName(eps, nameInput.value)">Guardar</button>
                  <button type="button" class="ui-btn-ghost" (click)="editingEpsId.set(null)">Cancelar</button>
                } @else {
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-semibold text-on-surface truncate">{{ eps.name }}</p>
                    <p class="text-[11px] text-on-surface-variant">{{ eps.code }}</p>
                  </div>
                  <span class="ui-badge" [class]="eps.active ? 'bg-secondary-container/30 text-primary' : 'bg-surface-container-high text-on-surface-variant'">
                    {{ eps.active ? 'Activa' : 'Inactiva' }}
                  </span>
                  <button type="button" class="ui-btn-ghost" (click)="selectEps(eps)" [attr.aria-pressed]="selected()?.id === eps.id">Planes</button>
                  <button type="button" class="ui-btn-ghost" (click)="editingEpsId.set(eps.id)">Editar</button>
                  <button type="button" class="ui-btn-ghost" [attr.data-testid]="'eps-toggle-' + eps.id" (click)="toggleEps(eps)">
                    {{ eps.active ? 'Desactivar' : 'Activar' }}
                  </button>
                }
              </li>
            } @empty {
              @if (!epsError()) { <li class="ui-empty" data-testid="eps-empty">No hay EPS registradas. Crea la primera con el formulario.</li> }
            }
          </ul>
        }
      </section>

      <!-- Planes -->
      <section class="ui-card flex flex-col gap-4" aria-labelledby="plans-title">
        <h2 id="plans-title" class="ui-section-title">Planes {{ selected() ? 'de ' + selected()!.name : '' }}</h2>
        @if (!selected()) {
          <p class="ui-empty" data-testid="plans-no-eps">Selecciona una EPS para ver y administrar sus planes.</p>
        } @else {
          <form [formGroup]="planForm" (ngSubmit)="createPlan()" novalidate class="flex flex-col gap-3" data-testid="plan-form" [attr.aria-busy]="savingPlan()">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="flex flex-col gap-1">
                <label for="plan-code" class="ui-label">Código *</label>
                <input id="plan-code" class="ui-input" formControlName="code" maxlength="40" [attr.aria-invalid]="invalid(planForm.controls.code)" />
              </div>
              <div class="flex flex-col gap-1">
                <label for="plan-name" class="ui-label">Nombre *</label>
                <input id="plan-name" class="ui-input" formControlName="name" maxlength="160" [attr.aria-invalid]="invalid(planForm.controls.name)" />
              </div>
              <div class="flex flex-col gap-1">
                <label for="plan-regime" class="ui-label">Régimen *</label>
                <select id="plan-regime" class="ui-input" formControlName="regimeCode" [attr.aria-invalid]="invalid(planForm.controls.regimeCode)" aria-describedby="plan-regime-help">
                  <option value="">Selecciona…</option>
                  @for (regime of regimes(); track regime.code) {
                    <option [value]="regime.code" [disabled]="regime.id === null">{{ regime.name }}{{ regime.id === null ? ' (sin identificador)' : '' }}</option>
                  }
                </select>
              </div>
            </div>
            @if (regimesWithoutId() > 0) {
              <p id="plan-regime-help" class="text-[11px] text-on-surface-variant">
                Algunos regímenes no exponen su identificador en el catálogo; solo se pueden usar los ya asociados a un plan existente.
              </p>
            }
            <button type="submit" class="ui-btn-primary" data-testid="plan-create" [disabled]="savingPlan()">
              {{ savingPlan() ? 'Guardando...' : 'Crear plan' }}
            </button>
          </form>

          <div role="alert" aria-live="assertive" aria-atomic="true">
            @if (planError()) { <p class="ui-alert-error" data-testid="plan-error">{{ planError() }}</p> }
          </div>
          <div role="status" aria-live="polite">
            @if (loadingPlans()) { <p class="ui-empty">Cargando planes...</p> }
          </div>

          @if (!loadingPlans()) {
            <ul class="flex flex-col gap-2" aria-label="Planes de la EPS">
              @for (plan of plans(); track plan.id) {
                <li class="ui-row flex-wrap">
                  @if (editingPlanId() === plan.id) {
                    <label class="sr-only" [for]="'plan-edit-' + plan.id">Nombre de {{ plan.code }}</label>
                    <input [id]="'plan-edit-' + plan.id" class="ui-input flex-1 min-w-40" [value]="plan.name" #planName maxlength="160" />
                    <button type="button" class="ui-btn-ghost" (click)="savePlanName(plan, planName.value)">Guardar</button>
                    <button type="button" class="ui-btn-ghost" (click)="editingPlanId.set(null)">Cancelar</button>
                  } @else {
                    <div class="flex-1 min-w-0">
                      <p class="text-[13px] font-semibold text-on-surface truncate">{{ plan.name }}</p>
                      <p class="text-[11px] text-on-surface-variant">{{ plan.code }} · {{ plan.regimeName || plan.regimeCode || 'Régimen' }}</p>
                    </div>
                    <span class="ui-badge" [class]="plan.active ? 'bg-secondary-container/30 text-primary' : 'bg-surface-container-high text-on-surface-variant'">
                      {{ plan.active ? 'Activo' : 'Inactivo' }}
                    </span>
                    <button type="button" class="ui-btn-ghost" (click)="editingPlanId.set(plan.id)">Editar</button>
                    <button type="button" class="ui-btn-ghost" (click)="togglePlan(plan)">{{ plan.active ? 'Desactivar' : 'Activar' }}</button>
                  }
                </li>
              } @empty {
                <li class="ui-empty" data-testid="plans-empty">Esta EPS aún no tiene planes.</li>
              }
            </ul>
          }
        }
      </section>
    </div>
  `,
})
export class EpsAdminComponent {
  private readonly api = inject(AdminApi);
  private readonly catalogs = inject(CatalogApi);
  private readonly fb = inject(FormBuilder);

  readonly epsList = signal<EpsDto[]>([]);
  readonly loadingEps = signal(true);
  readonly savingEps = signal(false);
  readonly epsError = signal<string | null>(null);
  readonly epsMessage = signal('');
  readonly editingEpsId = signal<number | null>(null);

  readonly selected = signal<EpsDto | null>(null);
  readonly plans = signal<PlanDto[]>([]);
  readonly loadingPlans = signal(false);
  readonly savingPlan = signal(false);
  readonly planError = signal<string | null>(null);
  readonly editingPlanId = signal<number | null>(null);

  private readonly catalogRegimes = signal<CatalogEntryDto[]>([]);
  /** Ids de régimen aprendidos de planes existentes (el catálogo no expone `id`). */
  private readonly knownRegimeIds = signal<Record<string, number>>({});

  readonly regimes = computed<RegimeOption[]>(() =>
    this.catalogRegimes().map((r) => ({ code: r.code, name: r.name, id: r.id ?? this.knownRegimeIds()[r.code] ?? null })),
  );
  readonly regimesWithoutId = computed(() => this.regimes().filter((r) => r.id === null).length);

  readonly epsForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
  });

  readonly planForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    regimeCode: ['', [Validators.required]],
  });

  constructor() {
    this.loadEps();
    this.catalogs.getCatalogs().subscribe({
      next: (c) => this.catalogRegimes.set(c.insuranceRegimes),
      error: () => this.planError.set('No fue posible cargar los regímenes de afiliación.'),
    });
  }

  invalid(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && control.touched;
  }

  loadEps() {
    this.loadingEps.set(true);
    this.api.listEps().subscribe({
      next: (list) => {
        this.epsList.set(list);
        this.loadingEps.set(false);
        const sel = this.selected();
        if (sel) this.selected.set(list.find((e) => e.id === sel.id) ?? null);
      },
      error: (e: unknown) => {
        this.epsError.set(errorMessage(e, 'No fue posible cargar las EPS.'));
        this.loadingEps.set(false);
      },
    });
  }

  createEps() {
    if (this.savingEps()) return;
    this.epsForm.markAllAsTouched();
    if (this.epsForm.invalid) {
      this.epsError.set('Ingresa el código y el nombre de la EPS.');
      return;
    }
    const value = this.epsForm.getRawValue();
    this.savingEps.set(true);
    this.epsError.set(null);
    this.epsMessage.set('');
    this.api.createEps({ code: value.code.trim(), name: value.name.trim() }).subscribe({
      next: (eps) => {
        this.savingEps.set(false);
        this.epsForm.reset();
        this.epsList.update((list) => [...list, eps].sort((a, b) => a.name.localeCompare(b.name)));
        this.epsMessage.set(`EPS "${eps.name}" creada.`);
      },
      error: (e: unknown) => {
        this.savingEps.set(false);
        this.epsError.set(errorMessage(e, 'No fue posible crear la EPS.'));
      },
    });
  }

  private patchEps(eps: EpsDto, name: string, active: boolean, success: string) {
    this.epsError.set(null);
    this.epsMessage.set('');
    this.api.updateEps(eps.id, { name, active }).subscribe({
      next: (updated) => {
        this.epsList.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
        if (this.selected()?.id === updated.id) this.selected.set(updated);
        this.editingEpsId.set(null);
        this.epsMessage.set(success);
      },
      error: (e: unknown) => this.epsError.set(errorMessage(e, 'No fue posible actualizar la EPS.')),
    });
  }

  saveEpsName(eps: EpsDto, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      this.epsError.set('El nombre de la EPS es obligatorio.');
      return;
    }
    this.patchEps(eps, trimmed, eps.active, 'Nombre actualizado.');
  }

  toggleEps(eps: EpsDto) {
    this.patchEps(eps, eps.name, !eps.active, eps.active ? `EPS "${eps.name}" desactivada.` : `EPS "${eps.name}" activada.`);
  }

  selectEps(eps: EpsDto) {
    this.selected.set(eps);
    this.planError.set(null);
    this.loadPlans(eps.id);
  }

  private loadPlans(epsId: number) {
    this.loadingPlans.set(true);
    this.api.listPlans(epsId).subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.learnRegimes(plans);
        this.loadingPlans.set(false);
      },
      error: (e: unknown) => {
        this.planError.set(errorMessage(e, 'No fue posible cargar los planes.'));
        this.loadingPlans.set(false);
      },
    });
  }

  private learnRegimes(plans: PlanDto[]) {
    const learned = { ...this.knownRegimeIds() };
    for (const plan of plans) {
      if (plan.regimeCode && plan.regimeId != null) learned[plan.regimeCode] = plan.regimeId;
    }
    this.knownRegimeIds.set(learned);
  }

  createPlan() {
    const eps = this.selected();
    if (!eps || this.savingPlan()) return;
    this.planForm.markAllAsTouched();
    const value = this.planForm.getRawValue();
    const regime = this.regimes().find((r) => r.code === value.regimeCode);
    if (this.planForm.invalid || !regime || regime.id === null) {
      this.planError.set('Ingresa código, nombre y un régimen válido para el plan.');
      return;
    }
    this.savingPlan.set(true);
    this.planError.set(null);
    this.api.createPlan(eps.id, { regimeId: regime.id, code: value.code.trim(), name: value.name.trim() }).subscribe({
      next: (plan) => {
        this.savingPlan.set(false);
        this.planForm.reset();
        this.plans.update((list) => [...list, { ...plan, regimeCode: plan.regimeCode ?? regime.code, regimeName: plan.regimeName ?? regime.name }]);
      },
      error: (e: unknown) => {
        this.savingPlan.set(false);
        this.planError.set(errorMessage(e, 'No fue posible crear el plan.'));
      },
    });
  }

  private patchPlan(plan: PlanDto, name: string, active: boolean) {
    this.planError.set(null);
    this.api.updatePlan(plan.id, { name, active }).subscribe({
      next: (updated) => {
        this.plans.update((list) => list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        this.editingPlanId.set(null);
      },
      error: (e: unknown) => this.planError.set(errorMessage(e, 'No fue posible actualizar el plan.')),
    });
  }

  savePlanName(plan: PlanDto, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      this.planError.set('El nombre del plan es obligatorio.');
      return;
    }
    this.patchPlan(plan, trimmed, plan.active);
  }

  togglePlan(plan: PlanDto) {
    this.patchPlan(plan, plan.name, !plan.active);
  }
}
