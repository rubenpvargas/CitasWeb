import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PortalService, HIC_BUILDING_IMG } from '../../services/portal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-8 bg-surface justify-center">
      <div class="flex flex-col w-full pb-8">
        
        <!-- Tarjeta / Encabezado Arquitectónico Superior con Imagen Institucional -->
        <div class="relative w-full rounded-2xl overflow-hidden bg-surface-container shadow-xs mb-6 border border-outline-variant/30">
          <div class="relative w-full aspect-[16/9]">
            <img
              [src]="buildingImage"
              alt="Hospital Internacional de Colombia HIC"
              class="w-full h-full object-cover"
              referrerpolicy="no-referrer"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#002042]/85 via-[#002042]/30 to-transparent"></div>
            <div class="absolute bottom-3 left-4 right-4 text-white">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white mb-1.5 border border-white/20">
                <span class="material-symbols-outlined text-[14px]">local_hospital</span>
                <span>Campus Médico de Alta Especialidad</span>
              </div>
              <p class="text-base font-semibold tracking-tight text-white drop-shadow-sm">
                Tu salud, más cerca de ti.
              </p>
            </div>
          </div>
        </div>

        <!-- Encabezado Clínico de Acceso -->
        <div class="mb-5">
          <h1 class="text-2xl font-semibold text-primary tracking-tight mb-1">
            Iniciar sesión
          </h1>
          <p class="text-[13px] text-on-surface-variant leading-relaxed">
            Ingresa tus credenciales para gestionar tus citas médicas en el HIC y el Instituto Cardiovascular FCV.
          </p>
        </div>

        <!-- Alerta de Validación Clínica Empática y Descartable -->
        @if (showAlert()) {
          <div class="flex items-start gap-2.5 p-3.5 rounded-xl bg-error-container text-on-error-container mb-5 transition-opacity duration-200 border border-[#fecdd3]">
            <span class="material-symbols-outlined text-error text-[20px] shrink-0 select-none mt-0.5">
              error
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] font-semibold text-error mb-0.5">Credenciales no reconocidas</p>
              <p class="text-[12px] text-on-error-container leading-tight">
                {{ alertMessage() }}
              </p>
            </div>
            <button
              type="button"
              (click)="dismissAlert()"
              aria-label="Cerrar notificación"
              class="text-on-error-container hover:opacity-75 p-0.5 shrink-0 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        }

        <!-- Formulario de Acceso -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          
          <!-- Campo: Correo Electrónico -->
          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-[13px] font-semibold text-on-surface flex items-center justify-between">
              <span>Correo electrónico</span>
              <span class="text-[11px] text-on-surface-variant font-normal">Obligatorio</span>
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none select-none">
                mail
              </span>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="ejemplo@correo.com"
                autocomplete="email"
                class="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-container-lowest text-on-surface text-[14px] border border-outline-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-outline"
              />
            </div>
            @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
              <p class="text-[11px] text-error">Ingresa un correo electrónico válido.</p>
            }
          </div>

          <!-- Campo: Contraseña -->
          <div class="flex flex-col gap-1.5">
            <label for="password" class="text-[13px] font-semibold text-on-surface flex items-center justify-between">
              <span>Contraseña</span>
              <span class="text-[11px] text-on-surface-variant font-normal">Obligatorio</span>
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none select-none">
                lock
              </span>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
                class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface text-[14px] border border-outline-variant/60 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-outline"
              />
              <button
                type="button"
                (click)="toggleShowPassword()"
                aria-label="Mostrar u ocultar contraseña"
                class="absolute right-3 p-1 text-outline hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
              >
                <span class="material-symbols-outlined text-[20px]">
                  {{ showPassword() ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Recordarme y Enlace de Recuperación -->
          <div class="flex items-center justify-between pt-0.5">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                formControlName="rememberMe"
                class="w-4 h-4 rounded text-primary-container accent-[#0A3663] cursor-pointer"
              />
              <span class="text-[13px] text-on-surface-variant">Recordarme</span>
            </label>
            <button
              type="button"
              (click)="goToRecover()"
              class="text-[13px] font-semibold text-secondary hover:underline transition-all inline-flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
            >
              <span>¿Olvidaste tu contraseña?</span>
            </button>
          </div>

          <!-- Botón Principal con Estado Interactivo -->
          <div class="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full h-12 rounded-lg bg-primary-container text-white text-[15px] font-semibold hover:bg-primary active:bg-primary shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              @if (loading()) {
                <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>Comprobando acceso...</span>
              } @else {
                <span>Iniciar sesión</span>
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              }
            </button>

            <!-- Acceso Directo de Demostración para evaluación instantánea -->
            <button
              type="button"
              (click)="quickDemoLogin()"
              class="w-full h-9 rounded-lg bg-surface-container text-secondary hover:bg-surface-container-high text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">verified</span>
              <span>Ingresar directamente con cuenta de prueba (Ana Martínez)</span>
            </button>
          </div>
        </form>

        <!-- Tarjeta de Ayuda para Nuevo Usuario -->
        <div class="mt-6 p-4 rounded-xl bg-surface-container-low text-center border border-outline-variant/30">
          <p class="text-[13px] text-on-surface-variant mb-2">
            ¿Primera vez que agendas citas en nuestro portal?
          </p>
          <button
            type="button"
            (click)="goToRegister()"
            class="inline-flex items-center justify-center gap-1 text-[13px] font-semibold text-secondary hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            <span>Crear cuenta de paciente</span>
            <span class="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </div>

        <!-- Información Asistencial de Soporte -->
        <div class="mt-4 flex items-center justify-center gap-4 text-outline text-[11px] font-semibold">
          <a href="tel:6076392828" class="hover:text-on-surface transition-colors flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">support_agent</span>
            <span>Mesa de Ayuda (607) 639-2828</span>
          </a>
          <span class="text-surface-dim">•</span>
          <button type="button" (click)="goToRecover()" class="hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-outline">
            <span class="material-symbols-outlined text-[14px]">verified_user</span>
            <span>Términos y Privacidad</span>
          </button>
        </div>

        <!-- Pie Institucional de Confianza Clínica -->
        <div class="mt-6 pt-4 text-center">
          <div class="inline-flex items-center gap-1.5 text-on-surface-variant text-[11px] mb-1">
            <span class="material-symbols-outlined text-secondary text-[16px]">health_and_safety</span>
            <span class="font-semibold text-on-surface">Red Hospitalaria Internacional</span>
          </div>
          <p class="text-[11px] text-outline max-w-xs mx-auto leading-relaxed">
            Hospital Internacional de Colombia | Fundación Cardiovascular de Colombia. Vigilado Minsalud.
          </p>
        </div>

      </div>
    </main>
  `
})
export class LoginComponent {
  private readonly portalService = inject(PortalService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly buildingImage = HIC_BUILDING_IMG;
  readonly showPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly showAlert = signal<boolean>(false);
  readonly alertMessage = signal<string>('Correo electrónico o contraseña incorrectos. Por favor verifica tus datos.');

  readonly loginForm = this.fb.group({
    email: ['paciente@fcv.org', [Validators.required, Validators.email]],
    password: ['ContrasenaSegura2025', [Validators.required]],
    rememberMe: [true]
  });

  toggleShowPassword() {
    this.showPassword.update((v) => !v);
  }

  dismissAlert() {
    this.showAlert.set(false);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.showAlert.set(false);

    const email = this.loginForm.value.email?.trim() ?? '';
    const password = this.loginForm.value.password ?? '';
    this.authService.login(email, password).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.portalService.setAuthenticatedPatient(user);
        this.portalService.isAuthenticated.set(true);
        this.portalService.setScreen('dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.showAlert.set(true);
      },
    });
  }

  onSubmitLegacy() {
    this.loading.set(true);
    this.showAlert.set(false);

    setTimeout(() => {
      this.loading.set(false);
      const email = this.loginForm.value.email?.trim().toLowerCase();
      // Valid credentials or demo
      if (email === 'paciente@fcv.org' || email === 'ana.martinez@ejemplo.com' || (email && email.includes('@'))) {
        this.portalService.setScreen('dashboard');
      } else {
        this.alertMessage.set('Correo electrónico o contraseña incorrectos. Por favor verifica tus datos.');
        this.showAlert.set(true);
      }
    }, 800);
  }

  quickDemoLogin() {
    this.showAlert.set(true);
  }

  goToRecover() {
    this.portalService.setScreen('recuperar');
  }

  goToRegister() {
    this.portalService.setScreen('registro');
  }
}
