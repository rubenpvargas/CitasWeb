import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/api/api-errors';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-8 bg-surface justify-center">
      <div class="flex flex-col w-full py-2">
        
        <!-- Tarjeta Contenedora Principal -->
        <div class="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-xs border border-outline-variant/40">
          
          @if (!sentSuccess()) {
            <!-- Vista 1: Formulario de Solicitud -->
            <div class="flex flex-col">
              <!-- Encabezado con Icono Seguro -->
              <div class="flex flex-col items-center text-center mb-6">
                <div class="w-14 h-14 rounded-2xl bg-[#eaedff] flex items-center justify-center text-secondary mb-3 shadow-xs">
                  <span class="material-symbols-outlined text-[28px]">lock</span>
                </div>
                <h1 class="text-2xl text-on-surface font-semibold mb-1 tracking-tight">Recuperar contraseña</h1>
                <p class="text-[14px] text-on-surface-variant max-w-sm leading-relaxed">
                  Ingresa el correo electrónico asociado a tu cuenta de paciente. Te enviaremos un enlace seguro para restablecer tu contraseña.
                </p>
              </div>

              <!-- Error de solicitud (red/servidor) -->
              <div role="alert" aria-live="assertive" aria-atomic="true">
                @if (requestError()) {
                  <div data-testid="forgot-error" class="mb-4 p-3.5 rounded-xl bg-error-container text-on-error-container flex items-start gap-2.5 border border-[#fecdd3]">
                    <span class="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5" aria-hidden="true">error</span>
                    <p class="text-[13px] leading-snug">{{ requestError() }}</p>
                  </div>
                }
              </div>

              <!-- Formulario Clínico Seguro -->
              <form [formGroup]="recoveryForm" (ngSubmit)="onSubmit()" [attr.aria-busy]="loading()" novalidate class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label for="patient-email" class="text-[13px] font-medium text-on-surface flex items-center gap-1.5">
                    <span>Correo electrónico registrado</span>
                    <span class="text-error font-medium">*</span>
                  </label>
                  <div class="relative flex items-center">
                    <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      mail
                    </span>
                    <input
                      id="patient-email"
                      type="email"
                      formControlName="email"
                      placeholder="ejemplo@correo.com"
                      autocomplete="email"
                      required
                      [attr.aria-invalid]="emailInvalid()"
                      [attr.aria-describedby]="emailInvalid() ? 'patient-email-error' : null"
                      class="w-full h-11 pl-11 pr-4 bg-surface-container-lowest text-on-surface text-[14px] rounded-xl border border-outline-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-outline"
                    />
                  </div>
                  @if (emailInvalid()) {
                    <p id="patient-email-error" class="text-[12px] text-error flex items-center gap-1 mt-0.5">
                      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                      Por favor, introduce una dirección de correo válida.
                    </p>
                  }
                </div>

                <!-- Botón de Envío -->
                <button
                  type="submit"
                  data-testid="forgot-submit"
                  [disabled]="loading()"
                  class="w-full h-11 mt-1 bg-primary-container hover:bg-primary text-white text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs cursor-pointer disabled:opacity-75"
                >
                  @if (loading()) {
                    <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    <span>Enviando enlace...</span>
                  } @else {
                    <span>Enviar instrucciones</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  }
                </button>
              </form>
            </div>
          } @else {
            <!-- Vista 2: Confirmación Exitosa -->
            <div data-testid="forgot-success" class="flex flex-col items-center text-center animate-fade-in">
              <div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-3 shadow-xs">
                <span class="material-symbols-outlined text-[32px] text-secondary">mark_email_read</span>
              </div>
              <h2 class="text-2xl text-on-surface font-semibold mb-1 tracking-tight">Revisa tu correo electrónico</h2>
              
              <!-- Mensaje Institucional -->
              <div role="status" aria-live="polite" class="bg-surface-container-low rounded-2xl p-4 text-left mb-4 w-full border border-outline-variant/30">
                <p class="text-[14px] text-on-surface leading-relaxed">
                  Si existe una cuenta asociada a este correo, recibirás las instrucciones y el enlace seguro de restablecimiento:
                  <strong class="font-semibold text-primary block mt-0.5">{{ submittedEmail() }}</strong>
                </p>
                <div class="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/30 text-outline text-[12px]">
                  <span class="material-symbols-outlined text-[16px] text-secondary shrink-0">timer</span>
                  <span>El enlace será válido durante <strong>30 minutos</strong> por seguridad.</span>
                </div>
              </div>

              <!-- Enlace de desarrollo: solo si la API lo devuelve (perfil local) -->
              @if (developmentToken(); as token) {
                <div data-testid="dev-link" class="w-full mb-4 p-3 rounded-xl bg-secondary-container/20 border border-secondary-container/50 text-left">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex flex-col">
                      <span class="text-[11px] uppercase font-bold text-secondary tracking-wider">Enlace de desarrollo</span>
                      <span class="text-[13px] text-on-surface font-medium">Solo disponible en entorno local, sin envío de correo.</span>
                    </div>
                    <a
                      routerLink="/restablecer"
                      [queryParams]="{ token: token }"
                      class="px-3 py-1.5 rounded-lg bg-secondary text-white text-[12px] font-semibold hover:bg-[#00476e] transition-colors cursor-pointer shrink-0"
                    >
                      Abrir enlace
                    </a>
                  </div>
                </div>
              }

              <!-- Reenvío (vuelve a llamar a la API) -->
              <div class="flex flex-col items-center gap-1.5 mb-2">
                <p class="text-[13px] text-on-surface-variant flex items-center gap-1.5">
                  <span>¿No recibiste el correo?</span>
                  <button
                    type="button"
                    data-testid="forgot-resend"
                    (click)="handleResend()"
                    [disabled]="loading()"
                    class="text-secondary hover:text-primary font-semibold text-[13px] underline cursor-pointer bg-transparent border-0 p-0 disabled:opacity-60"
                  >
                    {{ loading() ? 'Reenviando...' : 'Reenviar correo ahora' }}
                  </button>
                </p>
                <div role="alert" aria-live="assertive" class="text-[12px] text-error">{{ requestError() }}</div>
              </div>
            </div>
          }

          <!-- Navegación Secundaria -->
          <div class="mt-6 pt-3 flex flex-col items-center justify-center border-t border-outline-variant/20">
            <a
              routerLink="/login"
              class="inline-flex items-center gap-1.5 text-secondary hover:text-primary font-semibold text-[14px] transition-colors py-1 px-2 rounded-lg cursor-pointer bg-transparent border-0"
            >
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
              <span>Volver a iniciar sesión</span>
            </a>
          </div>

        </div>

        <!-- Soporte Institucional HIC / FCV -->
        <div class="mt-4 bg-surface-container-low rounded-2xl p-4 flex items-start gap-3 border border-outline-variant/30">
          <div class="p-2 rounded-full bg-surface-container-highest text-secondary shrink-0">
            <span class="material-symbols-outlined text-[18px]">phone</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[13px] font-semibold text-on-surface">Asistencia a pacientes</span>
            <p class="text-[12px] text-on-surface-variant mt-0.5 leading-snug">
              Si no tienes acceso a tu correo registrado o cambiaste de número, comunícate con la central de atención al paciente HIC al
              <a href="tel:6076392828" class="text-secondary font-semibold hover:underline inline-block">(607) 639-2828</a>.
            </p>
          </div>
        </div>

        <!-- Ficha de Seguridad Médica Transparente -->
        <div class="mt-3 flex items-center justify-center gap-2 text-outline text-[11px]">
          <span class="material-symbols-outlined text-[14px] text-secondary">verified_user</span>
          <span>Red Segura Hospital Internacional de Colombia • FCV</span>
        </div>

      </div>
    </main>
  `
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loading = signal<boolean>(false);
  readonly sentSuccess = signal<boolean>(false);
  readonly submittedEmail = signal<string>('');
  readonly requestError = signal<string | null>(null);
  /** Solo presente si la API corre con expose-development-token=true. */
  readonly developmentToken = signal<string | null>(null);

  readonly recoveryForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  emailInvalid(): boolean {
    const control = this.recoveryForm.controls.email;
    return control.invalid && control.touched;
  }

  onSubmit() {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }
    this.send(this.recoveryForm.controls.email.value.trim());
  }

  handleResend() {
    const email = this.submittedEmail();
    if (email) this.send(email);
  }

  private send(email: string) {
    if (this.loading()) return;
    this.loading.set(true);
    this.requestError.set(null);

    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.submittedEmail.set(email);
        // Mismo mensaje neutro exista o no la cuenta (sin enumeración).
        this.sentSuccess.set(true);
        this.developmentToken.set(response?.developmentToken || null);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.requestError.set(errorMessage(error, 'No fue posible enviar la solicitud. Inténtalo nuevamente.'));
      },
    });
  }
}
