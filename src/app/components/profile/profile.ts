import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PortalService } from '../../services/portal.service';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-primary-container text-white flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold text-primary tracking-tight leading-none">Mi Perfil Clínico</span>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">Datos del Paciente</span>
          </div>
        </div>
        <button
          type="button"
          (click)="logout()"
          class="text-[12px] font-semibold text-error hover:bg-error-container/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-28 bg-surface">
      <div class="flex flex-col w-full gap-5">

        <!-- Tarjeta de Identidad del Paciente -->
        <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/40 flex items-center gap-4">
          <img
            [src]="patient().avatarUrl"
            alt="Foto de perfil"
            class="w-16 h-16 rounded-full object-cover border-2 border-secondary/40 shadow-xs"
            referrerpolicy="no-referrer"
          />
          <div class="flex flex-col min-w-0 flex-1">
            <div class="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary mb-0.5">
              <span class="material-symbols-outlined text-[14px]">verified</span>
              <span>Paciente Titular Verificado</span>
            </div>
            <h2 class="text-lg font-bold text-primary truncate">{{ patient().fullName }}</h2>
            <p class="text-[13px] text-on-surface-variant">{{ patient().docType }} {{ patient().docNumber }}</p>
          </div>
        </div>

        <!-- Información Personal y de Contacto -->
        <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/40 flex flex-col gap-3">
          <h3 class="text-[13px] font-bold text-primary uppercase tracking-wide">Datos de Contacto</h3>
          
          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span class="material-symbols-outlined text-secondary text-[20px]">mail</span>
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] text-on-surface-variant">Correo electrónico</span>
              <span class="text-[13px] font-medium text-on-surface truncate">{{ patient().email }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span class="material-symbols-outlined text-secondary text-[20px]">call</span>
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] text-on-surface-variant">Teléfono celular</span>
              <span class="text-[13px] font-medium text-on-surface">+57 {{ patient().phone }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span class="material-symbols-outlined text-secondary text-[20px]">home_pin</span>
            <div class="flex flex-col min-w-0">
              <span class="text-[11px] text-on-surface-variant">Zona de residencia</span>
              <span class="text-[13px] font-medium text-on-surface">Floridablanca / Bucaramanga, Santander</span>
            </div>
          </div>
        </div>

        <!-- Seguridad y Acceso -->
        <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/40 flex flex-col gap-3">
          <h3 class="text-[13px] font-bold text-primary uppercase tracking-wide">Seguridad de la Cuenta</h3>

          <button
            type="button"
            (click)="goToResetPassword()"
            class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left cursor-pointer border border-outline-variant/20"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
              <div class="flex flex-col">
                <span class="text-[13px] font-semibold text-primary">Cambiar o actualizar contraseña</span>
                <span class="text-[11px] text-on-surface-variant">Abrir pantalla "Crear nueva contraseña"</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
          </button>

          <button
            type="button"
            (click)="goToRecover()"
            class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left cursor-pointer border border-outline-variant/20"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-secondary text-[20px]">lock_clock</span>
              <div class="flex flex-col">
                <span class="text-[13px] font-semibold text-primary">Solicitar recuperación de acceso</span>
                <span class="text-[11px] text-on-surface-variant">Pantalla "Recuperar contraseña"</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
          </button>
        </div>

        <!-- Información Institucional de la Entidad -->
        <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
          <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[18px]">security</span>
            <span class="text-[13px] font-semibold">Garantía de Protección de Datos</span>
          </div>
          <p class="text-[12px] text-on-surface-variant leading-relaxed">
            Tus datos de salud están protegidos bajo estándares internacionales de confidencialidad hospitalaria (Ley Estatutaria 1581 de 2012 y normatividad vigente del Ministerio de Salud de Colombia).
          </p>
        </div>

        <!-- Botón Cerrar Sesión -->
        <button
          type="button"
          (click)="logout()"
          class="w-full h-11 rounded-xl bg-surface-container-lowest border border-error/40 text-error text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-error-container/30 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span>Cerrar sesión en este dispositivo</span>
        </button>

      </div>
    </main>
  `
})
export class ProfileComponent {
  private readonly portalService = inject(PortalService);
  readonly patient = this.portalService.activePatient;

  goToResetPassword() {
    this.portalService.setScreen('reset-password');
  }

  goToRecover() {
    this.portalService.setScreen('recuperar');
  }

  logout() {
    this.portalService.setScreen('login');
  }
}
