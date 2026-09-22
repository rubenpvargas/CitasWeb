import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PortalService } from '../../services/portal.service';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
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

        <!-- Banner de Enlace Expirado (Demo interactiva) -->
        @if (showExpiredBanner()) {
          <div class="mb-4 p-4 rounded-2xl bg-error-container text-on-error-container border border-[#fecdd3] animate-fade-in">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">lock_clock</span>
              <div class="flex-1">
                <p class="text-[14px] font-semibold text-error mb-0.5">Enlace no válido o expirado</p>
                <p class="text-[12px] text-on-error-container leading-relaxed">
                  El enlace de recuperación ha expirado por motivos de seguridad médica y protección de datos. Solicita uno nuevo para continuar.
                </p>
                <div class="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    (click)="goToRecover()"
                    class="px-3 py-1.5 rounded-lg bg-error text-white text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer border-0"
                  >
                    Solicitar nuevo enlace
                  </button>
                  <button
                    type="button"
                    (click)="toggleExpiredDemo()"
                    class="px-2 py-1 text-[12px] font-medium text-error hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

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

          <!-- Banner de Error si no coinciden -->
          @if (showMismatchError()) {
            <div class="mb-4 p-3 rounded-lg bg-error-container text-on-error-container border border-[#fecdd3]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-error">error</span>
                <p class="text-[12px] text-error font-medium">
                  Las contraseñas no coinciden. Por favor revisa ambos campos.
                </p>
              </div>
            </div>
          }

          <!-- Formulario -->
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            
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
                  placeholder="Introduce al menos 8 caracteres"
                  autocomplete="new-password"
                  class="w-full h-11 px-3.5 pr-11 rounded-lg bg-surface-container-low text-on-surface text-[14px] border border-outline-variant/50 focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline"
                />
                <button
                  type="button"
                  (click)="toggleShowNewPassword()"
                  aria-label="Alternar visibilidad"
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
            <div class="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/30">
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
                  aria-label="Alternar visibilidad"
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
                [disabled]="loading()"
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

        <!-- Barra Demostración de Estados UX -->
        <div class="mt-4 p-3 rounded-xl bg-surface-container flex items-center justify-between border border-outline-variant/20">
          <span class="text-[12px] text-on-surface-variant font-medium">Demo de Estados UX:</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="toggleExpiredDemo()"
              class="px-2.5 py-1 rounded-md bg-surface text-outline hover:text-primary text-[12px] font-medium transition-colors border border-outline-variant/40 cursor-pointer"
            >
              Enlace Expirado
            </button>
            <button
              type="button"
              (click)="openSuccessModal()"
              class="px-2.5 py-1 rounded-md bg-secondary text-white text-[12px] font-medium transition-colors cursor-pointer border-0"
            >
              Éxito
            </button>
          </div>
        </div>

        <!-- Modal de Éxito / Confirmación -->
        @if (showSuccessModal()) {
          <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center px-4 animate-fade-in">
            <div class="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-lg flex flex-col items-center text-center border border-outline-variant/40">
              <div class="w-16 h-16 rounded-full bg-[#89f5e7] flex items-center justify-center text-[#003d37] mb-4 shadow-xs">
                <span class="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <h2 class="text-xl text-primary font-semibold tracking-tight mb-2">
                Contraseña actualizada con éxito
              </h2>
              <p class="text-[13px] text-on-surface-variant mb-6 leading-relaxed">
                Tu contraseña ha sido modificada correctamente. Ya puedes iniciar sesión con tus nuevas credenciales y gestionar tus citas médicas en HIC y FCV.
              </p>
              <button
                type="button"
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
  private readonly portalService = inject(PortalService);
  private readonly fb = inject(FormBuilder);

  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly showExpiredBanner = signal<boolean>(false);
  readonly showMismatchError = signal<boolean>(false);
  readonly showSuccessModal = signal<boolean>(false);

  readonly resetForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  readonly newPassVal = signal<string>('');

  constructor() {
    this.resetForm.get('newPassword')?.valueChanges.subscribe((val) => {
      this.newPassVal.set(val || '');
    });
  }

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
    const p2 = this.resetForm.get('confirmPassword')?.value;
    return p1.length > 0 && p1 === p2;
  });

  toggleShowNewPassword() {
    this.showNewPassword.update((v) => !v);
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  toggleExpiredDemo() {
    this.showExpiredBanner.update((v) => !v);
  }

  openSuccessModal() {
    this.showSuccessModal.set(true);
  }

  onSubmit() {
    const p1 = this.resetForm.get('newPassword')?.value;
    const p2 = this.resetForm.get('confirmPassword')?.value;

    if (!p1 || p1 !== p2 || this.score() < 3) {
      this.showMismatchError.set(true);
      return;
    }

    this.showMismatchError.set(false);
    this.loading.set(true);

    setTimeout(() => {
      this.loading.set(false);
      this.showSuccessModal.set(true);
    }, 600);
  }

  goToLogin() {
    this.showSuccessModal.set(false);
    this.portalService.setScreen('login');
  }

  goToRecover() {
    this.portalService.setScreen('recuperar');
  }
}
