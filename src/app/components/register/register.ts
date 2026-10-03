import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorCode, errorMessage, fieldErrors } from '../../core/api/api-errors';
import { RegisterRequest } from '../../core/api/api.types';
import { LOGIN_NOTICE_PARAM, LoginNotice } from '../../core/auth/login-notice';

type FieldName = 'firstName' | 'lastName' | 'docType' | 'docNumber' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'terms';

/** Campo del DTO RegisterRequest -> control del formulario. */
const DTO_TO_CONTROL: Record<string, FieldName> = {
  firstName: 'firstName',
  lastName: 'lastName',
  documentType: 'docType',
  documentNumber: 'docNumber',
  email: 'email',
  phone: 'phone',
  password: 'password',
};

const CLIENT_MESSAGES: Record<FieldName, string> = {
  firstName: 'Ingresa tus nombres.',
  lastName: 'Ingresa tus apellidos.',
  docType: 'Selecciona el tipo de documento.',
  docNumber: 'Ingresa el número de documento.',
  email: 'Ingresa un correo electrónico válido.',
  phone: 'Ingresa un teléfono de contacto.',
  password: 'La contraseña debe tener entre 8 y 72 caracteres.',
  confirmPassword: 'Las contraseñas no coinciden.',
  terms: 'Debes aceptar los términos para continuar.',
};

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-12 bg-surface justify-center">
      <div class="flex flex-col w-full py-2 pb-10">

        <div role="alert" aria-live="assertive" aria-atomic="true">
        @if (registrationError()) {
          <div data-testid="register-error" class="mb-5 p-4 rounded-xl bg-error-container text-on-error-container flex items-start gap-3 border border-[#fecdd3]">
            <span class="material-symbols-outlined text-error text-lg" aria-hidden="true">error</span>
            <p class="text-[13px] leading-snug">{{ registrationError() }}</p>
          </div>
        }
        </div>

        <!-- Encabezado Clínico Institucional -->
        <div class="flex flex-col mb-6">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full bg-secondary"></span>
            <span class="text-[11px] uppercase tracking-wider text-secondary font-semibold">Hospital Internacional de Colombia</span>
          </div>
          <h1 class="text-2xl text-on-surface font-semibold tracking-tight">Crear cuenta de paciente</h1>
          <p class="text-[14px] text-on-surface-variant mt-1 leading-relaxed">
            Registra tus datos personales para acceder a la asignación y gestión de citas del HIC y FCV.
          </p>
        </div>

        <!-- Aviso Clínico Sutil -->
        <div class="bg-surface-container-low rounded-xl p-4 mb-6 flex items-start gap-3 border border-outline-variant/30">
          <div class="w-7 h-7 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-base">info</span>
          </div>
          <p class="text-[13px] text-on-surface-variant leading-relaxed">
            El registro crea una cuenta personal de usuario. Asegúrate de que el documento coincida exactamente con tu identificación oficial para validar coberturas y autorizaciones.
          </p>
        </div>

        <!-- Formulario de Registro -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" [attr.aria-busy]="loading()" novalidate class="flex flex-col gap-4">
          
          <!-- Nombres & Apellidos Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="first-name" class="text-[13px] font-medium text-on-surface-variant">Nombres *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="first-name"
                  type="text"
                  formControlName="firstName"
                  [attr.aria-invalid]="!!fieldError('firstName')"
                  [attr.aria-describedby]="fieldError('firstName') ? 'firstName-error' : null"
                  placeholder="Ej. Carlos Eduardo"
                  class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
              </div>
              @if (fieldError('firstName'); as msg) {
                <span id="firstName-error" class="text-[11px] text-error">{{ msg }}</span>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="last-name" class="text-[13px] font-medium text-on-surface-variant">Apellidos *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="last-name"
                  type="text"
                  formControlName="lastName"
                  [attr.aria-invalid]="!!fieldError('lastName')"
                  [attr.aria-describedby]="fieldError('lastName') ? 'lastName-error' : null"
                  placeholder="Ej. Gómez Silva"
                  class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
              </div>
              @if (fieldError('lastName'); as msg) {
                <span id="lastName-error" class="text-[11px] text-error">{{ msg }}</span>
              }
            </div>
          </div>

          <!-- Tipo de Documento & Número Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="doc-type" class="text-[13px] font-medium text-on-surface-variant">Tipo de documento *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <select
                  id="doc-type"
                  formControlName="docType"
                  [attr.aria-invalid]="!!fieldError('docType')"
                  [attr.aria-describedby]="fieldError('docType') ? 'docType-error' : null"
                  class="w-full h-11 px-3.5 pr-8 bg-transparent text-[14px] text-on-surface appearance-none focus:outline-none rounded-lg cursor-pointer"
                >
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="TI">Tarjeta de Identidad (TI)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="PA">Pasaporte (PA)</option>
                </select>
                <div class="absolute right-3 top-3 pointer-events-none text-outline">
                  <span class="material-symbols-outlined text-lg">arrow_drop_down</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="doc-number" class="text-[13px] font-medium text-on-surface-variant">Número de documento *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="doc-number"
                  type="tel"
                  inputmode="numeric"
                  formControlName="docNumber"
                  [attr.aria-invalid]="!!fieldError('docNumber')"
                  [attr.aria-describedby]="fieldError('docNumber') ? 'docNumber-error' : null"
                  placeholder="1098765432"
                  class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
              </div>
              @if (fieldError('docNumber'); as msg) {
                <span id="docNumber-error" class="text-[11px] text-error">{{ msg }}</span>
              }
            </div>
          </div>

          <!-- Correo Electrónico -->
          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-[13px] font-medium text-on-surface-variant">Correo electrónico *</label>
            <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
              <input
                id="email"
                type="email"
                formControlName="email"
                  [attr.aria-invalid]="!!fieldError('email')"
                  [attr.aria-describedby]="fieldError('email') ? 'email-error' : null"
                placeholder="paciente@ejemplo.com"
                autocomplete="email"
                class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
              />
            </div>
            @if (fieldError('email'); as msg) {
              <span id="email-error" class="text-[11px] text-error">{{ msg }}</span>
            }
          </div>

          <!-- Teléfono con prefijo Colombia -->
          <div class="flex flex-col gap-1.5">
            <label for="phone" class="text-[13px] font-medium text-on-surface-variant">Teléfono de contacto *</label>
            <div class="flex bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs overflow-hidden focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
              <div class="flex items-center gap-1 px-3.5 bg-surface-container-low text-on-surface-variant text-[13px] font-medium shrink-0 border-r border-outline-variant/40">
                <span class="w-4 h-3 bg-secondary-container rounded-xs inline-block relative overflow-hidden" title="Colombia">
                  <span class="block h-1.5 bg-[#fcd116]"></span>
                  <span class="block h-0.75 bg-[#003893]"></span>
                  <span class="block h-0.75 bg-[#ce1126]"></span>
                </span>
                <span>+57</span>
              </div>
              <input
                id="phone"
                type="tel"
                inputmode="tel"
                formControlName="phone"
                  [attr.aria-invalid]="!!fieldError('phone')"
                  [attr.aria-describedby]="fieldError('phone') ? 'phone-error' : null"
                placeholder="300 123 4567"
                autocomplete="tel"
                class="flex-1 h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none"
              />
            </div>
            @if (fieldError('phone'); as msg) {
              <span id="phone-error" class="text-[11px] text-error">{{ msg }}</span>
            }
          </div>

          <!-- Contraseña & Confirmar Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="password" class="text-[13px] font-medium text-on-surface-variant">Contraseña *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs flex items-center focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  [attr.aria-invalid]="!!fieldError('password')"
                  [attr.aria-describedby]="fieldError('password') ? 'password-error' : null"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  class="w-full h-11 px-3.5 pr-10 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
                <button
                  type="button"
                  (click)="toggleShowPassword()"
                  aria-label="Ver u ocultar contraseña"
                  class="absolute right-2 p-1.5 text-outline hover:text-on-surface rounded-full transition-colors flex items-center justify-center cursor-pointer"
                >
                  <span class="material-symbols-outlined text-lg">
                    {{ showPassword() ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
              @if (fieldError('password'); as msg) {
                <span id="password-error" class="text-[11px] text-error">{{ msg }}</span>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="confirm-password" class="text-[13px] font-medium text-on-surface-variant">Confirmar contraseña *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs flex items-center focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="confirm-password"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  [attr.aria-invalid]="!!fieldError('confirmPassword')"
                  [attr.aria-describedby]="fieldError('confirmPassword') ? 'confirmPassword-error' : null"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  class="w-full h-11 px-3.5 pr-10 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
                <button
                  type="button"
                  (click)="toggleShowConfirmPassword()"
                  aria-label="Ver u ocultar confirmar contraseña"
                  class="absolute right-2 p-1.5 text-outline hover:text-on-surface rounded-full transition-colors flex items-center justify-center cursor-pointer"
                >
                  <span class="material-symbols-outlined text-lg">
                    {{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
              @if (fieldError('confirmPassword'); as msg) {
                <span id="confirmPassword-error" class="text-[11px] text-error">{{ msg }}</span>
              }
            </div>
          </div>

          <!-- Password Requirement Checks -->
          <div class="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2 border border-outline-variant/30">
            <span class="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Requisitos de seguridad:</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="flex items-center gap-1.5 transition-colors" [class.text-secondary]="hasMinLength()" [class.text-outline]="!hasMinLength()">
                <span class="material-symbols-outlined text-base">{{ hasMinLength() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="text-[13px]">Mín. 8 caracteres</span>
              </div>
              <div class="flex items-center gap-1.5 transition-colors" [class.text-secondary]="hasUpper()" [class.text-outline]="!hasUpper()">
                <span class="material-symbols-outlined text-base">{{ hasUpper() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="text-[13px]">Una mayúscula</span>
              </div>
              <div class="flex items-center gap-1.5 transition-colors" [class.text-secondary]="hasNumber()" [class.text-outline]="!hasNumber()">
                <span class="material-symbols-outlined text-base">{{ hasNumber() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="text-[13px]">Un número</span>
              </div>
            </div>
          </div>

          <!-- Términos y Consentimiento -->
          <div class="flex items-start gap-3 mt-2">
            <div class="relative flex items-center pt-0.5">
              <input
                id="terms"
                type="checkbox"
                formControlName="terms"
                  [attr.aria-invalid]="!!fieldError('terms')"
                  [attr.aria-describedby]="fieldError('terms') ? 'terms-error' : null"
                class="w-5 h-5 rounded cursor-pointer accent-[#002042]"
              />
            </div>
            <label for="terms" class="text-[13px] text-on-surface-variant cursor-pointer select-none leading-snug">
              Acepto los <span class="text-secondary font-semibold hover:underline">términos y condiciones</span> y autorizo el tratamiento de mis datos personales en salud según la política institucional de la Fundación Cardiovascular de Colombia (FCV) y el Hospital Internacional de Colombia (HIC).
            </label>
          </div>
          @if (fieldError('terms'); as msg) {
            <span id="terms-error" class="text-[11px] text-error">{{ msg }}</span>
          }

          <!-- Submit Action Button -->
          <div class="mt-4 flex flex-col gap-3">
            <button
              id="submit-btn"
              data-testid="register-submit"
              type="submit"
              [disabled]="loading()"
              class="w-full h-12 bg-primary-container text-white hover:bg-primary active:scale-[0.99] text-[15px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              @if (loading()) {
                <span class="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                <span>Creando cuenta de paciente...</span>
              } @else {
                <span>Crear cuenta</span>
                <span class="material-symbols-outlined text-lg">arrow_forward</span>
              }
            </button>

            <!-- Secondary Login Link -->
            <div class="flex items-center justify-center gap-1 text-center py-2">
              <span class="text-[14px] text-on-surface-variant">¿Ya tienes una cuenta?</span>
              <a
                routerLink="/login"
                class="text-[15px] text-secondary hover:text-primary font-semibold transition-colors bg-transparent border-0 cursor-pointer p-0"
              >
                Iniciar sesión
              </a>
            </div>
          </div>

        </form>
      </div>
    </main>
  `
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly registrationError = signal<string | null>(null);
  /** Errores por campo devueltos por la API (400 VALIDATION_ERROR o 409 de unicidad). */
  readonly serverErrors = signal<Partial<Record<FieldName, string>>>({});

  readonly registerForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    docType: ['CC', [Validators.required, Validators.maxLength(32)]],
    docNumber: ['', [Validators.required, Validators.maxLength(64)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.maxLength(32)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required]],
    terms: [false, [Validators.requiredTrue]],
  });

  /** Re-evalúa los mensajes de campo cuando cambia el estado del formulario. */
  private readonly formStatus = toSignal(this.registerForm.events, { initialValue: null });
  readonly currentPassword = toSignal(this.registerForm.controls.password.valueChanges, { initialValue: '' });

  constructor() {
    // Un error del servidor deja de aplicar cuando el usuario corrige los datos.
    this.registerForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (Object.keys(this.serverErrors()).length > 0) this.serverErrors.set({});
    });
  }

  readonly hasMinLength = computed(() => this.currentPassword().length >= 8);
  readonly hasUpper = computed(() => /[A-Z]/.test(this.currentPassword()));
  readonly hasNumber = computed(() => /[0-9]/.test(this.currentPassword()));

  fieldError(name: FieldName): string | null {
    this.formStatus();
    const server = this.serverErrors()[name];
    if (server) return server;
    const control = this.registerForm.controls[name];
    if (!control.touched) return null;
    if (name === 'confirmPassword') {
      return control.value && control.value === this.registerForm.controls.password.value
        ? null
        : CLIENT_MESSAGES.confirmPassword;
    }
    return control.invalid ? CLIENT_MESSAGES[name] : null;
  }

  toggleShowPassword() {
    this.showPassword.update((v) => !v);
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.loading()) return;
    this.serverErrors.set({});
    this.registerForm.markAllAsTouched();
    const form = this.registerForm.getRawValue();
    if (this.registerForm.invalid || form.password !== form.confirmPassword) {
      this.registrationError.set('Revisa los campos marcados e inténtalo nuevamente.');
      return;
    }

    this.loading.set(true);
    this.registrationError.set(null);

    const request: RegisterRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentType: form.docType,
      documentNumber: form.docNumber.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    };
    this.authService.register(request).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/login'], {
          queryParams: { [LOGIN_NOTICE_PARAM]: 'registro-exitoso' satisfies LoginNotice },
        });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.handleError(error);
      },
    });
  }

  private handleError(error: unknown) {
    const code = errorCode(error);
    const message = errorMessage(error, 'No fue posible crear la cuenta. Inténtalo nuevamente.');
    if (code === 'EMAIL_ALREADY_REGISTERED') {
      this.serverErrors.set({ email: message });
    } else if (code === 'DOCUMENT_ALREADY_REGISTERED') {
      this.serverErrors.set({ docNumber: message });
    } else if (code === 'VALIDATION_ERROR') {
      const errors: Partial<Record<FieldName, string>> = {};
      for (const field of fieldErrors(error)) {
        const control = DTO_TO_CONTROL[field];
        if (control) errors[control] = CLIENT_MESSAGES[control];
      }
      this.serverErrors.set(errors);
    }
    this.registrationError.set(message);
  }
}
