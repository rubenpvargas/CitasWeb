import { ChangeDetectionStrategy, Component, inject, input, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorCode, errorMessage } from '../../core/api/api-errors';
import { LOGIN_NOTICE_PARAM, LoginNotice } from '../../core/auth/login-notice';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-12 bg-surface justify-center">
      <div class="flex flex-col w-full py-2 pb-6">

        <!-- Micro-Badge Institucional de Seguridad Clínica -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-white">
              <span class="material-symbols-outlined text-[18px]">security</span>
            </div>
            <div>
              <p class="text-[11px] text-secondary font-semibold uppercase tracking-wider">HIC • FCV</p>
              <p class="text-[12px] text-outline">Centro de Seguridad Clínica</p>
            </div>
          </div>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant border border-outline-variant/30">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary mr-1.5 animate-pulse"></span>
            Canal Seguro TLS 1.3
          </span>
        </div>

        <!-- Banner de Enlace no válido / expirado / ausente -->
        <div role="alert" aria-live="assertive" aria-atomic="true">
        @if (showExpiredBanner()) {
          <div data-testid="reset-invalid-token" class="mb-4 p-4 rounded-2xl bg-error-container text-on-error-container border border-[#fecdd3] animate-fade-in">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5" aria-hidden="true">lock_clock</span>
              <div class="flex-1">
                <p class="text-[14px] font-semibold text-error mb-0.5">Enlace no válido o expirado</p>
                <p class="text-[12px] text-on-error-container leading-relaxed">
                  El enlace de recuperación no es válido, ya fue usado o expiró por motivos de seguridad médica y protección de datos. Solicita uno nuevo para continuar.
                </p>
                <div class="mt-3 flex items-center gap-2">
                  <a
                    routerLink="/recuperar"
                    data-testid="request-new-link"
                    class="px-3 py-1.5 rounded-lg bg-error text-white text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer border-0"
                  >
                    Solicitar nuevo enlace
                  </a>
                </div>
              </div>
            </div>
          </div>
        }
        </div>

        <!-- Tarjeta Principal del Flujo -->
        <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-outline-variant/40">
          <!-- Encabezado -->
          <header class="mb-6">
            <div class="inline-flex p-2.5 rounded-xl bg-surface-container text-primary-container mb-3 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">lock_reset</span>
            </div>
            <h1 class="text-2xl text-primary font-semibold tracking-tight mb-1">
              Crear nueva contraseña
            </h1>
            <p class="text-[13px] text-on-surface-variant leading-relaxed">
              Define una nueva contraseña segura para proteger el acceso a tus citas y datos de paciente.
            </p>
          </header>

          <!-- Banner de Error (validación, red o servidor) -->
          <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (formError()) {
            <div data-testid="reset-error" class="mb-4 p-3 rounded-lg bg-error-container text-on-error-container border border-[#fecdd3]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-error" aria-hidden="true">error</span>
                <p class="text-[12px] text-error font-medium">
                  {{ formError() }}
                </p>
              </div>
            </div>
          }
          </div>

          <!-- Formulario -->
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" [attr.aria-busy]="loading()" novalidate class="flex flex-col gap-4">
            
            <!-- Campo Nueva Contraseña -->
            <div class="flex flex-col gap-1.5">
              <label for="new-password" class="text-[13px] text-on-surface font-medium flex items-center justify-between">
                <span>Nueva contraseña</span>
                <span class="text-[11px] font-semibold" [class]="strengthLabelClass()">
                  {{ strengthLabel() }}
                </span>
              </label>
              <div class="relative flex items-center">
                <input
                  id="new-password"
                  [type]="showNewPassword() ? 'text' : 'password'"
                  formControlName="newPassword"
                  aria-describedby="password-requirements"
                  placeholder="Introduce al menos 8 caracteres"
                  autocomplete="new-password"
                  class="w-full h-11 px-3.5 pr-11 rounded-lg bg-surface-container-low text-on-surface text-[14px] border border-outline-variant/50 focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline"
                />
                <button
                  type="button"
                  (click)="toggleShowNewPassword()"
                  aria-label="Mostrar u ocultar nueva contraseña"
                  class="absolute right-3 p-1 text-outline hover:text-primary transition-colors cursor-pointer bg-transparent border-0"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    {{ showNewPassword() ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>

              <!-- Barra Medidora de Fortaleza -->
              <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden flex gap-1 mt-1">
                <div class="h-full w-1/3 rounded-full transition-colors duration-300" [class]="bar1Class()"></div>
                <div class="h-full w-1/3 rounded-full transition-colors duration-300" [class]="bar2Class()"></div>
                <div class="h-full w-1/3 rounded-full transition-colors duration-300" [class]="bar3Class()"></div>
              </div>
            </div>

            <!-- Lista de Requisitos de Protección de Datos Clínicos -->
            <div id="password-requirements" class="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/30">
              <p class="text-[11px] text-on-surface-variant font-semibold tracking-wide uppercase">
                Requisitos de protección de datos clínicos:
              </p>
              <div class="flex items-center gap-2 transition-colors" [class.text-secondary]="hasMinLength()" [class.text-outline]="!hasMinLength()">
                <span class="material-symbols-outlined text-[16px]">{{ hasMinLength() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="text-[13px]">Mínimo 8 caracteres</span>
              </div>
              <div class="flex items-center gap-2 transition-colors" [class.text-secondary]="hasUpper()" [class.text-outline]="!hasUpper()">
                <span class="material-symbols-outlined text-[16px]">{{ hasUpper() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="text-[13px]">Al menos una letra mayúscula</span>
              </div>
              <div class="flex items-center gap-2 transition-colors" [class.text-secondary]="hasNumOrSymbol()" [class.text-outline]="!hasNumOrSymbol()">
                <span class="material-symbols-outlined text-[16px]">{{ hasNumOrSymbol() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="text-[13px]">Al menos un número o símbolo</span>
              </div>
            </div>

            <!-- Campo Confirmar Contraseña -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label for="confirm-password" class="text-[13px] text-on-surface font-medium">
                  Confirmar contraseña
                </label>
                @if (passwordsMatch()) {
                  <span class="text-[11px] text-secondary font-semibold flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">check</span> Coincide
                  </span>
                }
              </div>
              <div class="relative flex items-center">
                <input
                  id="confirm-password"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="Repite tu nueva contraseña"
                  autocomplete="new-password"
                  class="w-full h-11 px-3.5 pr-11 rounded-lg bg-surface-container-low text-on-surface text-[14px] border border-outline-variant/50 focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline"
                />
                <button
                  type="button"
                  (click)="toggleShowConfirmPassword()"
                  aria-label="Mostrar u ocultar confirmación de contraseña"
                  class="absolute right-3 p-1 text-outline hover:text-primary transition-colors cursor-pointer bg-transparent border-0"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    {{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Botón Guardar -->
            <div class="pt-1">
              <button
                type="submit"
                data-testid="reset-submit"
                [disabled]="loading() || !token()"
                class="w-full h-11 rounded-lg bg-primary-container text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-xs hover:bg-primary active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75"
              >
                @if (loading()) {
                  <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Actualizando seguridad...</span>
                } @else {
                  <span class="material-symbols-outlined text-[18px]">vpn_key</span>
                  <span>Cambiar contraseña</span>
                }
              </button>
            </div>

            <!-- Nota de Pie Institucional -->
            <div class="pt-1 flex items-center justify-center gap-1.5 text-center">
              <span class="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
              <p class="text-[12px] text-outline">
                Protección garantizada bajo estándar de confidencialidad FCV.
              </p>
            </div>
          </form>
        </div>

        <!-- Modal de Éxito / Confirmación -->
        @if (showSuccessModal()) {
          <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center px-4 animate-fade-in">
            <div role="dialog" aria-modal="true" aria-labelledby="reset-success-title" data-testid="reset-success" class="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-lg flex flex-col items-center text-center border border-outline-variant/40">
              <div class="w-16 h-16 rounded-full bg-[#89f5e7] flex items-center justify-center text-[#003d37] mb-4 shadow-xs">
                <span class="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <h2 id="reset-success-title" class="text-xl text-primary font-semibold tracking-tight mb-2">
                Contraseña actualizada con éxito
              </h2>
              <p class="text-[13px] text-on-surface-variant mb-6 leading-relaxed">
                Tu contraseña ha sido modificada correctamente. Ya puedes iniciar sesión con tus nuevas credenciales y gestionar tus citas médicas en HIC y FCV.
              </p>
              <button
                type="button"
                data-testid="reset-go-login"
                (click)="goToLogin()"
                class="w-full h-11 rounded-lg bg-primary-container text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-xs hover:bg-primary active:scale-[0.99] transition-all cursor-pointer border-0"
              >
                <span>Iniciar sesión ahora</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        }

      </div>
    </main>
  `
})
export class ResetPasswordComponent {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  /** Token de un solo uso recibido en `/restablecer?token=...`. */
  readonly token = input<string | undefined>();

  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly tokenRejected = signal<boolean>(false);
  readonly formError = signal<string | null>(null);
  readonly showSuccessModal = signal<boolean>(false);

  /** Sin token o con token rechazado por la API (409 INVALID_RESET_TOKEN). */
  readonly showExpiredBanner = computed(() => !this.token() || this.tokenRejected());

  readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly newPassVal = toSignal(this.resetForm.controls.newPassword.valueChanges, { initialValue: '' });
  readonly confirmVal = toSignal(this.resetForm.controls.confirmPassword.valueChanges, { initialValue: '' });

  readonly hasMinLength = computed(() => this.newPassVal().length >= 8);
  readonly hasUpper = computed(() => /[A-Z]/.test(this.newPassVal()));
  readonly hasNumOrSymbol = computed(() => /[0-9\W]/.test(this.newPassVal()));

  readonly score = computed(() => {
    let s = 0;
    if (this.hasMinLength()) s++;
    if (this.hasUpper()) s++;
    if (this.hasNumOrSymbol()) s++;
    return s;
  });

  readonly strengthLabel = computed(() => {
    switch (this.score()) {
      case 1: return 'Seguridad: Básica';
      case 2: return 'Seguridad: Media';
      case 3: return 'Seguridad: Robusta';
      default: return 'Seguridad: Pendiente';
    }
  });

  readonly strengthLabelClass = computed(() => {
    switch (this.score()) {
      case 1: return 'text-error';
      case 2: return 'text-secondary';
      case 3: return 'text-emerald-700';
      default: return 'text-outline';
    }
  });

  readonly bar1Class = computed(() => {
    if (this.score() >= 1) {
      return this.score() === 1 ? 'bg-error' : this.score() === 2 ? 'bg-secondary' : 'bg-emerald-600';
    }
    return 'bg-outline-variant';
  });

  readonly bar2Class = computed(() => {
    if (this.score() >= 2) {
      return this.score() === 2 ? 'bg-secondary' : 'bg-emerald-600';
    }
    return 'bg-outline-variant';
  });

  readonly bar3Class = computed(() => {
    if (this.score() >= 3) {
      return 'bg-emerald-600';
    }
    return 'bg-outline-variant';
  });

  readonly passwordsMatch = computed(() => {
    const p1 = this.newPassVal();
    return p1.length > 0 && p1 === this.confirmVal();
  });

  toggleShowNewPassword() {
    this.showNewPassword.update((v) => !v);
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit() {
    const token = this.token();
    if (this.loading() || !token) return;
    const { newPassword, confirmPassword } = this.resetForm.getRawValue();

    if (newPassword.length > 72 || this.score() < 3) {
      this.formError.set('La contraseña no cumple los requisitos de seguridad indicados.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.formError.set('Las contraseñas no coinciden. Por favor revisa ambos campos.');
      return;
    }

    this.formError.set(null);
    this.loading.set(true);

    this.authService.confirmPasswordReset(token, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetForm.reset();
        this.showSuccessModal.set(true);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (errorCode(error) === 'INVALID_RESET_TOKEN') {
          this.tokenRejected.set(true);
          return;
        }
        this.formError.set(errorMessage(error, 'No fue posible actualizar la contraseña. Inténtalo nuevamente.'));
      },
    });
  }

  goToLogin() {
    this.showSuccessModal.set(false);
    void this.router.navigate(['/login'], {
      queryParams: { [LOGIN_NOTICE_PARAM]: 'contrasena-actualizada' satisfies LoginNotice },
    });
  }
}
