import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminApi, ProfessionalCreateRequest, ProfessionalDto, codeList } from '../../../core/api/admin.api';
import { errorCode, errorMessage, fieldErrors } from '../../../core/api/api-errors';

type Field = keyof ProfessionalCreateRequest;

const FIELD_MESSAGES: Record<Field, string> = {
  firstName: 'Ingresa los nombres.',
  lastName: 'Ingresa los apellidos.',
  documentType: 'Selecciona el tipo de documento.',
  documentNumber: 'Ingresa el número de documento.',
  email: 'Ingresa un correo electrónico válido.',
  phone: 'Ingresa un teléfono de contacto.',
  password: 'La contraseña debe tener entre 8 y 72 caracteres, una mayúscula y un número.',
  professionalCode: 'Ingresa el código del profesional.',
  licenseNumber: 'Ingresa el número de registro médico.',
};

/** Código de duplicado (409) → campo del formulario. */
const DUPLICATE_FIELD: Record<string, Field> = {
  DUPLICATE_EMAIL: 'email',
  DUPLICATE_DOCUMENT: 'documentNumber',
  DUPLICATE_PROFESSIONAL_CODE: 'professionalCode',
  DUPLICATE_LICENSE: 'licenseNumber',
};

/** Misma política que el dominio (`PasswordPolicy`): 8–72, una mayúscula y un dígito. */
function strongPassword(control: { value: string }) {
  const v = control.value ?? '';
  return v.length >= 8 && v.length <= 72 && /[A-Z]/.test(v) && /\d/.test(v) ? null : { weakPassword: true };
}

/** HU-010: alta y listado de profesionales (ADMIN). Datos sintéticos únicamente. */
@Component({
  selector: 'app-professionals-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="grid md:grid-cols-[1fr_1.2fr] gap-5">
      <section class="ui-card flex flex-col gap-4" aria-labelledby="pro-form-title">
        <h2 id="pro-form-title" class="ui-section-title">Crear profesional</h2>
        <p class="text-[12px] text-on-surface-variant -mt-2">Usa únicamente datos sintéticos de laboratorio.</p>

        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (formError()) { <p class="ui-alert-error" data-testid="pro-error">{{ formError() }}</p> }
        </div>
        <div role="status" aria-live="polite">
          @if (created()) { <p class="ui-alert-success" data-testid="pro-success">Profesional "{{ created() }}" creado. Configura sus capacidades en la lista.</p> }
        </div>

        <form [formGroup]="form" (ngSubmit)="create()" novalidate class="flex flex-col gap-3" data-testid="pro-form" [attr.aria-busy]="saving()">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label for="pro-firstName" class="ui-label">Nombres *</label>
              <input id="pro-firstName" class="ui-input" formControlName="firstName" maxlength="100" placeholder="Prof. Sintético"
                [attr.aria-invalid]="!!error('firstName')" [attr.aria-describedby]="error('firstName') ? 'pro-firstName-error' : null" />
              @if (error('firstName'); as m) { <span id="pro-firstName-error" class="ui-field-error">{{ m }}</span> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-lastName" class="ui-label">Apellidos *</label>
              <input id="pro-lastName" class="ui-input" formControlName="lastName" maxlength="100" placeholder="De Prueba"
                [attr.aria-invalid]="!!error('lastName')" [attr.aria-describedby]="error('lastName') ? 'pro-lastName-error' : null" />
              @if (error('lastName'); as m) { <span id="pro-lastName-error" class="ui-field-error">{{ m }}</span> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-documentType" class="ui-label">Tipo de documento *</label>
              <select id="pro-documentType" class="ui-input" formControlName="documentType">
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-documentNumber" class="ui-label">Número de documento *</label>
              <input id="pro-documentNumber" class="ui-input" formControlName="documentNumber" maxlength="64" placeholder="900000001"
                [attr.aria-invalid]="!!error('documentNumber')" [attr.aria-describedby]="error('documentNumber') ? 'pro-documentNumber-error' : null" />
              @if (error('documentNumber'); as m) { <span id="pro-documentNumber-error" class="ui-field-error">{{ m }}</span> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-email" class="ui-label">Correo electrónico *</label>
              <input id="pro-email" type="email" class="ui-input" formControlName="email" maxlength="254" placeholder="profesional@example.test" autocomplete="off"
                [attr.aria-invalid]="!!error('email')" [attr.aria-describedby]="error('email') ? 'pro-email-error' : null" />
              @if (error('email'); as m) { <span id="pro-email-error" class="ui-field-error">{{ m }}</span> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-phone" class="ui-label">Teléfono *</label>
              <input id="pro-phone" type="tel" class="ui-input" formControlName="phone" maxlength="32" placeholder="3000000000"
                [attr.aria-invalid]="!!error('phone')" [attr.aria-describedby]="error('phone') ? 'pro-phone-error' : null" />
              @if (error('phone'); as m) { <span id="pro-phone-error" class="ui-field-error">{{ m }}</span> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-professionalCode" class="ui-label">Código profesional *</label>
              <input id="pro-professionalCode" class="ui-input" formControlName="professionalCode" maxlength="40" placeholder="PRO-0001"
                [attr.aria-invalid]="!!error('professionalCode')" [attr.aria-describedby]="error('professionalCode') ? 'pro-professionalCode-error' : null" />
              @if (error('professionalCode'); as m) { <span id="pro-professionalCode-error" class="ui-field-error">{{ m }}</span> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="pro-licenseNumber" class="ui-label">Registro médico *</label>
              <input id="pro-licenseNumber" class="ui-input" formControlName="licenseNumber" maxlength="40" placeholder="RM-SINT-0001"
                [attr.aria-invalid]="!!error('licenseNumber')" [attr.aria-describedby]="error('licenseNumber') ? 'pro-licenseNumber-error' : null" />
              @if (error('licenseNumber'); as m) { <span id="pro-licenseNumber-error" class="ui-field-error">{{ m }}</span> }
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label for="pro-password" class="ui-label">Contraseña inicial *</label>
            <input id="pro-password" type="password" class="ui-input" formControlName="password" maxlength="72" autocomplete="new-password"
              [attr.aria-invalid]="!!error('password')" aria-describedby="pro-password-rules" />
            <ul id="pro-password-rules" class="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[12px]" aria-label="Requisitos de contraseña">
              <li [class.text-secondary]="rules().length" [class.text-outline]="!rules().length">{{ rules().length ? '✓' : '○' }} 8 a 72 caracteres</li>
              <li [class.text-secondary]="rules().upper" [class.text-outline]="!rules().upper">{{ rules().upper ? '✓' : '○' }} Una mayúscula</li>
              <li [class.text-secondary]="rules().digit" [class.text-outline]="!rules().digit">{{ rules().digit ? '✓' : '○' }} Un número</li>
            </ul>
            @if (error('password'); as m) { <span class="ui-field-error">{{ m }}</span> }
          </div>
          <button type="submit" class="ui-btn-primary" data-testid="pro-create" [disabled]="saving()">{{ saving() ? 'Creando profesional...' : 'Crear profesional' }}</button>
        </form>
      </section>

      <section class="ui-card flex flex-col gap-3" aria-labelledby="pro-list-title">
        <div class="flex items-center justify-between">
          <h2 id="pro-list-title" class="ui-section-title">Profesionales</h2>
          <button type="button" class="ui-btn-ghost" (click)="load()" [disabled]="loading()">Actualizar</button>
        </div>
        <div role="status" aria-live="polite">
          @if (loading()) { <p class="ui-empty">Cargando profesionales...</p> }
        </div>
        <div role="alert" aria-live="assertive">
          @if (listError()) { <p class="ui-alert-error" data-testid="pro-list-error">{{ listError() }}</p> }
        </div>
        @if (!loading()) {
          <ul class="flex flex-col gap-2" aria-label="Profesionales registrados">
            @for (p of professionals(); track p.id) {
              <li class="ui-row flex-col items-stretch gap-2">
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-semibold text-on-surface truncate">{{ p.firstName }} {{ p.lastName }}</p>
                    <p class="text-[11px] text-on-surface-variant truncate">{{ p.email }} · {{ p.professionalCode }} · RM {{ p.licenseNumber }}</p>
                    <p class="text-[11px] text-on-surface-variant">Especialidades: {{ codes(p.specialtyCodes) || 'sin asignar' }} · Sedes: {{ codes(p.locationCodes) || 'sin asignar' }}</p>
                  </div>
                  <span class="ui-badge" [class]="p.active ? 'bg-secondary-container/30 text-primary' : 'bg-surface-container-high text-on-surface-variant'">{{ p.active ? 'Activo' : 'Inactivo' }}</span>
                </div>
              </li>
            } @empty {
              @if (!listError()) { <li class="ui-empty" data-testid="pro-empty">No hay profesionales registrados.</li> }
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class ProfessionalsAdminComponent {
  protected readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);

  readonly professionals = signal<ProfessionalDto[]>([]);
  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly created = signal<string | null>(null);
  readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    documentType: ['CC', [Validators.required]],
    documentNumber: ['', [Validators.required, Validators.maxLength(64)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.maxLength(32)]],
    password: ['', [Validators.required, strongPassword]],
    professionalCode: ['', [Validators.required, Validators.maxLength(40)]],
    licenseNumber: ['', [Validators.required, Validators.maxLength(40)]],
  });

  private readonly formEvents = toSignal(this.form.events, { initialValue: null });
  private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly rules = computed(() => {
    const v = this.password();
    return { length: v.length >= 8 && v.length <= 72, upper: /[A-Z]/.test(v), digit: /\d/.test(v) };
  });

  constructor() {
    this.load();
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (Object.keys(this.serverErrors()).length) this.serverErrors.set({});
    });
  }

  codes(value: ProfessionalDto['specialtyCodes']): string {
    return codeList(value).join(', ');
  }

  error(field: Field): string | null {
    this.formEvents();
    const server = this.serverErrors()[field];
    if (server) return server;
    const c = this.form.controls[field];
    return c.invalid && c.touched ? FIELD_MESSAGES[field] : null;
  }

  load() {
    this.loading.set(true);
    this.listError.set(null);
    this.api.listProfessionals().subscribe({
      next: (list) => {
        this.professionals.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.listError.set(errorMessage(e, 'No fue posible cargar los profesionales.'));
        this.loading.set(false);
      },
    });
  }

  create() {
    if (this.saving()) return;
    this.created.set(null);
    this.serverErrors.set({});
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set('Revisa los campos marcados e inténtalo nuevamente.');
      return;
    }
    const v = this.form.getRawValue();
    const request: ProfessionalCreateRequest = {
      ...v,
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      documentNumber: v.documentNumber.trim(),
      email: v.email.trim().toLowerCase(),
      phone: v.phone.trim(),
      professionalCode: v.professionalCode.trim(),
      licenseNumber: v.licenseNumber.trim(),
    };
    this.saving.set(true);
    this.formError.set(null);
    this.api.createProfessional(request).subscribe({
      next: (pro) => {
        this.saving.set(false);
        this.form.reset();
        this.created.set(`${pro.firstName} ${pro.lastName}`);
        this.professionals.update((list) => [...list, pro]);
      },
      error: (e: unknown) => {
        this.saving.set(false);
        const code = errorCode(e);
        const message = errorMessage(e, 'No fue posible crear el profesional.');
        const dupField = DUPLICATE_FIELD[code];
        if (dupField) this.serverErrors.set({ [dupField]: message });
        if (code === 'VALIDATION_ERROR') {
          const errs: Partial<Record<Field, string>> = {};
          for (const f of fieldErrors(e)) if (f in FIELD_MESSAGES) errs[f as Field] = FIELD_MESSAGES[f as Field];
          this.serverErrors.set(errs);
        }
        this.formError.set(message);
      },
    });
  }
}
