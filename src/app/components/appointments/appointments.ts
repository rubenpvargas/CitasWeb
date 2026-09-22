import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { PortalService } from '../../services/portal.service';
import { Cita } from '../../models/portal.types';

@Component({
  selector: 'app-appointments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-primary-container text-white flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]">calendar_month</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold text-primary tracking-tight leading-none">Mis Citas Médicas</span>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">Gestión y Seguimiento</span>
          </div>
        </div>
        <button
          type="button"
          (click)="goToBooking()"
          class="flex items-center gap-1 bg-primary-container text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg hover:bg-primary transition-colors cursor-pointer border-0"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>Nueva</span>
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-3 pb-28 bg-surface">
      <div class="flex flex-col w-full gap-4">

        <!-- Selector de Pestañas -->
        <div class="grid grid-cols-3 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 text-center">
          <button
            type="button"
            (click)="activeTab.set('proximas')"
            [class.bg-surface-container-lowest]="activeTab() === 'proximas'"
            [class.text-primary]="activeTab() === 'proximas'"
            [class.font-semibold]="activeTab() === 'proximas'"
            [class.shadow-xs]="activeTab() === 'proximas'"
            class="py-2 rounded-lg text-[13px] text-on-surface-variant transition-all cursor-pointer border-0"
          >
            Próximas ({{ upcomingList().length }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('historial')"
            [class.bg-surface-container-lowest]="activeTab() === 'historial'"
            [class.text-primary]="activeTab() === 'historial'"
            [class.font-semibold]="activeTab() === 'historial'"
            [class.shadow-xs]="activeTab() === 'historial'"
            class="py-2 rounded-lg text-[13px] text-on-surface-variant transition-all cursor-pointer border-0"
          >
            Historial ({{ pastList().length }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('canceladas')"
            [class.bg-surface-container-lowest]="activeTab() === 'canceladas'"
            [class.text-primary]="activeTab() === 'canceladas'"
            [class.font-semibold]="activeTab() === 'canceladas'"
            [class.shadow-xs]="activeTab() === 'canceladas'"
            class="py-2 rounded-lg text-[13px] text-on-surface-variant transition-all cursor-pointer border-0"
          >
            Canceladas ({{ cancelledList().length }})
          </button>
        </div>

        <!-- Lista de Citas -->
        <div class="flex flex-col gap-3">
          @if (currentList().length === 0) {
            <div class="rounded-2xl bg-surface-container-lowest shadow-xs p-8 flex flex-col items-center text-center gap-2 border border-outline-variant/30">
              <span class="material-symbols-outlined text-[36px] text-outline">event_busy</span>
              <p class="text-base font-semibold text-primary">No hay citas en esta sección</p>
              <p class="text-[13px] text-on-surface-variant max-w-xs">
                @if (activeTab() === 'proximas') {
                  Puedes programar una cita con nuestros especialistas en pocos minutos.
                } @else {
                  No se registran citas en este historial.
                }
              </p>
              @if (activeTab() === 'proximas') {
                <button
                  type="button"
                  (click)="goToBooking()"
                  class="mt-2 px-4 py-2 rounded-lg bg-primary-container text-white text-[13px] font-semibold cursor-pointer border-0"
                >
                  Agendar consulta ahora
                </button>
              }
            </div>
          } @else {
            @for (cita of currentList(); track cita.id) {
              <div class="rounded-2xl bg-surface-container-lowest shadow-xs p-4 flex flex-col gap-3 border border-outline-variant/40">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span
                        [class.bg-emerald-50]="cita.status === 'Confirmada'"
                        [class.text-emerald-800]="cita.status === 'Confirmada'"
                        [class.border-emerald-200]="cita.status === 'Confirmada'"
                        [class.bg-surface-container]="cita.status === 'Atendida'"
                        [class.text-on-surface-variant]="cita.status === 'Atendida'"
                        [class.bg-error-container]="cita.status === 'Cancelada'"
                        [class.text-error]="cita.status === 'Cancelada'"
                        class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                      >
                        {{ cita.status }}
                      </span>
                      <span class="text-[11px] text-on-surface-variant">· {{ cita.modality }}</span>
                    </div>
                    <h3 class="text-[15px] font-semibold text-primary truncate">{{ cita.specialty }}</h3>
                    <p class="text-[13px] text-on-surface-variant">{{ cita.doctorName }}</p>
                  </div>
                  <div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[20px]">{{ cita.icon }}</span>
                  </div>
                </div>

                <div class="bg-surface-container-low/70 p-3 rounded-xl flex flex-col gap-1 text-[12px] border border-outline-variant/20">
                  <div class="flex items-center gap-1.5 font-semibold text-primary">
                    <span class="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
                    <span>{{ cita.date }} · {{ cita.time }}</span>
                  </div>
                  <div class="flex items-start gap-1.5 text-on-surface-variant pt-0.5">
                    <span class="material-symbols-outlined text-[16px] text-outline shrink-0">location_on</span>
                    <span>{{ cita.sede }} - {{ cita.locationDetails }}</span>
                  </div>
                </div>

                @if (cita.status === 'Confirmada') {
                  <div class="flex items-center gap-2 pt-1 border-t border-outline-variant/20">
                    <button
                      type="button"
                      (click)="openPrep(cita)"
                      class="flex-1 py-2 rounded-lg bg-surface-container text-primary text-[12px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer border-0"
                    >
                      Ver preparación
                    </button>
                    <button
                      type="button"
                      (click)="cancelCita(cita.id)"
                      class="py-2 px-3 rounded-lg text-error hover:bg-error-container text-[12px] font-semibold transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      Cancelar cita
                    </button>
                  </div>
                }
              </div>
            }
          }
        </div>

      </div>
    </main>

    <!-- Modal de Preparación -->
    @if (prepCita(); as cita) {
      <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div class="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4 border border-outline-variant/40">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <h3 class="text-base font-semibold text-primary">Preparación para la Cita</h3>
            <button type="button" (click)="closePrep()" class="p-1 text-outline hover:text-on-surface rounded-full cursor-pointer border-0 bg-transparent">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <p class="text-[13px] text-on-surface font-medium">{{ cita.specialty }} con {{ cita.doctorName }}</p>
          <ul class="flex flex-col gap-2">
            @for (item of cita.preparation; track item; let i = $index) {
              <li class="flex items-start gap-2 text-[13px] text-on-surface">
                <span class="w-5 h-5 rounded-full bg-secondary-container/40 text-secondary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
                <span>{{ item }}</span>
              </li>
            }
          </ul>
          <button type="button" (click)="closePrep()" class="w-full h-10 rounded-lg bg-primary-container text-white text-[13px] font-semibold cursor-pointer border-0">
            Entendido
          </button>
        </div>
      </div>
    }
  `
})
export class AppointmentsComponent {
  private readonly portalService = inject(PortalService);

  readonly activeTab = signal<'proximas' | 'historial' | 'canceladas'>('proximas');
  readonly prepCita = signal<Cita | null>(null);

  readonly upcomingList = this.portalService.upcomingCitas;
  readonly pastList = this.portalService.pastCitas;
  readonly cancelledList = this.portalService.cancelledCitas;

  readonly currentList = computed(() => {
    switch (this.activeTab()) {
      case 'proximas': return this.upcomingList();
      case 'historial': return this.pastList();
      case 'canceladas': return this.cancelledList();
    }
  });

  goToBooking() {
    this.portalService.setScreen('solicitar');
  }

  openPrep(cita: Cita) {
    this.prepCita.set(cita);
  }

  closePrep() {
    this.prepCita.set(null);
  }

  cancelCita(id: string) {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita médica? Esta acción liberará el cupo para otro paciente.')) {
      this.portalService.cancelAppointment(id);
    }
  }
}
