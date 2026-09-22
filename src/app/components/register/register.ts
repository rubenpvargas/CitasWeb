import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PortalService } from '../../services/portal.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-12 bg-surface justify-center">
      <div class="flex flex-col w-full py-2 pb-10">

        <!-- Banner de Éxito -->
        @if (showSuccessBanner()) {
          <div class="mb-5 p-4 rounded-xl bg-primary text-white shadow-sm flex items-center gap-3 border border-secondary/40 animate-fade-in">
            <div class="w-8 h-8 rounded-full bg-secondary-container text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-lg font-bold">check_circle</span>
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <p class="text-[14px] text-white font-semibold">¡Cuenta creada exitosamente!</p>
              <p class="text-[12px] text-surface-variant">Redirigiendo a tu nuevo portal de citas médicas...</p>
            </div>
          </div>
        }

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
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          
          <!-- Nombres & Apellidos Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="first-name" class="text-[13px] font-medium text-on-surface-variant">Nombres *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="first-name"
                  type="text"
                  formControlName="firstName"
                  placeholder="Ej. Carlos Eduardo"
                  class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
              </div>
              @if (registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched) {
                <span class="text-[11px] text-error">Ingresa tus nombres.</span>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="last-name" class="text-[13px] font-medium text-on-surface-variant">Apellidos *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="last-name"
                  type="text"
                  formControlName="lastName"
                  placeholder="Ej. Gómez Silva"
                  class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
              </div>
              @if (registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched) {
                <span class="text-[11px] text-error">Ingresa tus apellidos.</span>
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
                  placeholder="1098765432"
                  class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
                />
              </div>
              @if (registerForm.get('docNumber')?.invalid && registerForm.get('docNumber')?.touched) {
                <span class="text-[11px] text-error">Ingresa el número de documento.</span>
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
                placeholder="paciente@ejemplo.com"
                class="w-full h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none rounded-lg"
              />
            </div>
            @if (isDuplicateEmail()) {
              <div class="flex items-center gap-1.5 text-error px-1 mt-0.5">
                <span class="material-symbols-outlined text-sm">error</span>
                <span class="text-[12px]">Este correo ya se encuentra registrado en el portal.</span>
              </div>
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
                placeholder="300 123 4567"
                class="flex-1 h-11 px-3.5 bg-transparent text-[14px] text-on-surface placeholder:text-outline/60 focus:outline-none"
              />
            </div>
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
                  placeholder="••••••••"
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
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="confirm-password" class="text-[13px] font-medium text-on-surface-variant">Confirmar contraseña *</label>
              <div class="relative bg-surface-container-lowest rounded-lg border border-outline-variant/60 shadow-xs flex items-center focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                <input
                  id="confirm-password"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="••••••••"
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
                class="w-5 h-5 rounded cursor-pointer accent-[#002042]"
              />
            </div>
            <label for="terms" class="text-[13px] text-on-surface-variant cursor-pointer select-none leading-snug">
              Acepto los <span class="text-secondary font-semibold hover:underline">términos y condiciones</span> y autorizo el tratamiento de mis datos personales en salud según la política institucional de la Fundación Cardiovascular de Colombia (FCV) y el Hospital Internacional de Colombia (HIC).
            </label>
          </div>
          @if (registerForm.get('terms')?.invalid && registerForm.get('terms')?.touched) {
            <span class="text-[11px] text-error">Debes aceptar los términos para continuar.</span>
          }

          <!-- Submit Action Button -->
          <div class="mt-4 flex flex-col gap-3">
            <button
              id="submit-btn"
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
              <button
                type="button"
                (click)="goToLogin()"
                class="text-[15px] text-secondary hover:text-primary font-semibold transition-colors bg-transparent border-0 cursor-pointer p-0"
              >
                Iniciar sesión
              </button>
            </div>
          </div>

        </form>
      </div>
    </main>
  `
})
export class RegisterComponent {
  private readonly portalService = inject(PortalService);
  private readonly fb = inject(FormBuilder);

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly showSuccessBanner = signal<boolean>(false);

  readonly registerForm = this.fb.group({
    firstName: ['Carlos Eduardo', [Validators.required]],
    lastName: ['Gómez Silva', [Validators.required]],
    docType: ['CC', [Validators.required]],
    docNumber: ['1098765432', [Validators.required]],
    email: ['paciente@ejemplo.com', [Validators.required, Validators.email]],
    phone: ['300 123 4567', [Validators.required]],
    password: ['SeguraHIC2025', [Validators.required]],
    confirmPassword: ['SeguraHIC2025', [Validators.required]],
    terms: [true, [Validators.requiredTrue]],
  });

  readonly currentPassword = signal<string>('SeguraHIC2025');

  constructor() {
    this.registerForm.get('password')?.valueChanges.subscribe((v) => {
      this.currentPassword.set(v || '');
    });
  }

  readonly hasMinLength = computed(() => this.currentPassword().length >= 8);
  readonly hasUpper = computed(() => /[A-Z]/.test(this.currentPassword()));
  readonly hasNumber = computed(() => /[0-9]/.test(this.currentPassword()));

  readonly isDuplicateEmail = computed(() => {
    const email = this.registerForm.get('email')?.value?.trim().toLowerCase();
    return email === 'duplicado@fcv.org';
  });

  toggleShowPassword() {
    this.showPassword.update((v) => !v);
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    setTimeout(() => {
      this.loading.set(false);
      this.showSuccessBanner.set(true);

      const fName = this.registerForm.value.firstName || 'Carlos';
      const lName = this.registerForm.value.lastName || 'Gómez';

      this.portalService.activePatient.set({
        fullName: `${fName} ${lName}`,
        firstName: fName,
        lastName: lName,
        docType: this.registerForm.value.docType || 'CC',
        docNumber: this.registerForm.value.docNumber || '1098765432',
        email: this.registerForm.value.email || 'paciente@ejemplo.com',
        phone: this.registerForm.value.phone || '300 123 4567',
        avatarUrl: this.portalService.activePatient().avatarUrl,
      });

      setTimeout(() => {
        this.portalService.setScreen('dashboard');
      }, 1200);
    }, 900);
  }

  goToLogin() {
    this.portalService.setScreen('login');
  }
}
