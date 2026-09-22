import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PortalService, HIC_LOGO_IMG } from '../../services/portal.service';
import { Cita } from '../../models/portal.types';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Encabezado Fijo Superior Institucional -->
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <img
            [src]="logoImg"
            alt="Logo HIC FCV Portal de Citas"
            class="h-8 w-auto object-contain"
            referrerpolicy="no-referrer"
          />
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold text-primary tracking-tight leading-none">Portal HIC | FCV</span>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">Inicio</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="goToProfile()"
            title="Ver perfil de paciente"
            class="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-secondary/40 transition-all cursor-pointer border-0 bg-transparent"
          >
            <img
              [src]="patient().avatarUrl"
              alt="Foto de perfil"
              class="w-8 h-8 rounded-full object-cover border border-outline-variant/60"
              referrerpolicy="no-referrer"
            />
          </button>
        </div>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-3 pb-24 bg-surface">
      <div class="flex flex-col w-full gap-4">

        <!-- Sección de Saludo del Paciente -->
        <section class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-2xl font-bold text-primary tracking-tight">Hola, {{ patient().firstName }}</span>
              <span class="text-[13px] text-on-surface-variant font-medium">Bienvenida a tu portal de salud HIC | FCV</span>
            </div>
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high text-primary shadow-xs">
              <span class="material-symbols-outlined text-[22px]">health_and_safety</span>
            </div>
          </div>

          <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-container-low shadow-xs border border-outline-variant/30">
            <span class="w-2 h-2 rounded-full bg-secondary shrink-0 animate-pulse"></span>
            <p class="text-[13px] text-on-surface">
              @if (!portalService.emptyStateSimulated() && upcomingCount() > 0) {
                Tienes <span class="font-semibold text-primary">{{ upcomingCount() }} cita médica</span> programada próximamente.
              } @else {
                No tienes citas pendientes para los próximos días.
              }
            </p>
          </div>
        </section>

        <!-- Tarjeta Destacada: Solicitar Nueva Cita -->
        <section class="relative overflow-hidden rounded-2xl bg-primary-container text-white shadow-sm border border-secondary/20">
          <div class="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-secondary/20 pointer-events-none blur-sm"></div>
          <div class="p-5 sm:p-6 flex flex-col gap-3 relative z-10">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 backdrop-blur-xs">
                <span class="material-symbols-outlined text-[#cce5ff] text-[20px]">add_circle</span>
              </div>
              <span class="text-base font-semibold tracking-tight text-white">Solicitar nueva cita</span>
            </div>
            <p class="text-[13px] text-[#dae2fd] leading-relaxed">
              Agenda tu consulta médica presencial o virtual con especialistas de alta complejidad en minutos.
            </p>
            <div class="pt-1 flex items-center gap-2.5">
              <button
                type="button"
                (click)="goToBooking()"
                class="flex items-center justify-center gap-2 bg-surface-container-lowest text-primary font-semibold text-[13px] px-4 py-2.5 rounded-lg active:scale-[0.98] transition-transform shadow-xs cursor-pointer border-0 hover:bg-white"
              >
                <span>Comenzar solicitud</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button
                type="button"
                (click)="toggleFaqModal()"
                class="flex items-center justify-center p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer border-0"
                title="Información y preguntas frecuentes"
              >
                <span class="material-symbols-outlined text-[18px]">help_outline</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Métricas Rápidas en Cuadrícula de 3 Columnas -->
        <div class="grid grid-cols-3 gap-2.5">
          <div class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-lowest shadow-xs text-center border border-outline-variant/30">
            <span class="text-xl font-bold text-secondary">{{ portalService.emptyStateSimulated() ? 0 : upcomingCount() }}</span>
            <span class="text-[11px] font-medium text-on-surface-variant mt-0.5">Próxima</span>
          </div>
          <div class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-lowest shadow-xs text-center border border-outline-variant/30">
            <span class="text-xl font-bold text-primary">{{ pastCount() }}</span>
            <span class="text-[11px] font-medium text-on-surface-variant mt-0.5">Completadas</span>
          </div>
          <div class="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-lowest shadow-xs text-center border border-outline-variant/30">
            <span class="text-xl font-bold text-outline">0</span>
            <span class="text-[11px] font-medium text-on-surface-variant mt-0.5">Pendientes</span>
          </div>
        </div>

        <!-- Sección: Próxima Cita Agendada -->
        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[20px]">event_upcoming</span>
              <h2 class="text-[15px] font-semibold text-primary">Próxima cita agendada</h2>
            </div>
            <button
              type="button"
              (click)="toggleEmptyState()"
              class="text-[12px] font-medium text-secondary hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              {{ portalService.emptyStateSimulated() ? 'Ver cita activa' : 'Simular estado vacío' }}
            </button>
          </div>

          <!-- Tarjeta con Cita Confirmada -->
          @if (!portalService.emptyStateSimulated() && nextCita(); as cita) {
            <div class="relative overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs p-5 flex flex-col gap-4 border border-outline-variant/40">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container"></div>
              
              <div class="flex items-start justify-between gap-3">
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Confirmada
                    </span>
                    <span class="text-[11px] text-on-surface-variant font-medium">· {{ cita.modality }}</span>
                  </div>
                  <span class="text-lg font-semibold text-primary tracking-tight truncate">{{ cita.specialty }}</span>
                  <span class="text-[14px] text-on-surface-variant font-medium mt-0.5">{{ cita.doctorName }}</span>
                </div>
                <div class="w-12 h-12 rounded-xl bg-surface-container-low shrink-0 flex items-center justify-center text-primary shadow-xs border border-outline-variant/30">
                  <span class="material-symbols-outlined text-[24px]">{{ cita.icon || 'cardiology' }}</span>
                </div>
              </div>

              <!-- Ficha de Detalles de Lugar y Hora -->
              <div class="flex flex-col gap-2.5 bg-surface-container-low/80 p-3.5 rounded-xl border border-outline-variant/30">
                <div class="flex items-center gap-2.5 text-on-surface">
                  <span class="material-symbols-outlined text-secondary text-[20px] shrink-0">calendar_clock</span>
                  <div class="flex flex-col">
                    <span class="text-[14px] font-semibold text-on-surface">{{ cita.date }}</span>
                    <span class="text-[12px] text-on-surface-variant">{{ cita.time }} ({{ cita.arrivalNotice }})</span>
                  </div>
                </div>
                <div class="flex items-start gap-2.5 text-on-surface pt-1 border-t border-outline-variant/20">
                  <span class="material-symbols-outlined text-outline text-[20px] shrink-0 mt-0.5">location_on</span>
                  <div class="flex flex-col">
                    <span class="text-[13px] text-primary font-semibold">{{ cita.sede }}</span>
                    <span class="text-[12px] text-on-surface-variant leading-snug">{{ cita.locationDetails }}</span>
                  </div>
                </div>
              </div>

              <!-- Botones de Acción de la Cita -->
              <div class="flex items-center gap-2.5 pt-0.5">
                <button
                  type="button"
                  (click)="openPreparation(cita)"
                  class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-surface-container text-primary text-[13px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer border-0"
                >
                  <span class="material-symbols-outlined text-[16px]">info</span>
                  <span>Ver preparación</span>
                </button>
                <button
                  type="button"
                  (click)="addToCalendar(cita)"
                  class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-surface-container text-secondary text-[13px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer border-0"
                >
                  <span class="material-symbols-outlined text-[16px]">calendar_add_on</span>
                  <span>Al calendario</span>
                </button>
              </div>
            </div>
          } @else {
            <!-- Tarjeta de Estado Vacío -->
            <div class="rounded-2xl bg-surface-container-lowest shadow-xs p-6 flex flex-col items-center text-center gap-3 border border-outline-variant/40 animate-fade-in">
              <div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                <span class="material-symbols-outlined text-[26px]">event_busy</span>
              </div>
              <div class="flex flex-col">
                <span class="text-base font-semibold text-primary">Sin citas programadas</span>
                <p class="text-[13px] text-on-surface-variant max-w-xs mt-1 leading-relaxed">
                  No tienes citas agendadas actualmente. Si necesitas atención médica especializada, puedes programar una consulta fácilmente.
                </p>
              </div>
              <button
                type="button"
                (click)="goToBooking()"
                class="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-white text-[13px] font-semibold hover:bg-primary transition-colors cursor-pointer border-0"
              >
                <span class="material-symbols-outlined text-[18px]">search</span>
                <span>Buscar disponibilidad</span>
              </button>
            </div>
          }
        </section>

        <!-- Sección: Mis Citas Recientes -->
        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[20px]">history</span>
              <h2 class="text-[15px] font-semibold text-primary">Mis citas recientes</h2>
            </div>
            <button
              type="button"
              (click)="goToMyAppointments()"
              class="text-[12px] font-semibold text-secondary hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
            >
              <span>Historial</span>
              <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>

          <div class="flex flex-col gap-2.5">
            @for (cita of recentPastCitas(); track cita.id) {
              <div class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low transition-colors border border-outline-variant/30">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[20px]">{{ cita.icon }}</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[14px] font-semibold text-on-surface truncate">{{ cita.specialty }}</span>
                    <span class="text-[12px] text-on-surface-variant truncate">{{ cita.doctorName }} · {{ cita.date }}</span>
                  </div>
                </div>
                <span class="shrink-0 text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                  {{ cita.status }}
                </span>
              </div>
            }
          </div>

          <div class="flex justify-center pt-1">
            <button
              type="button"
              (click)="goToMyAppointments()"
              class="text-[13px] font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1 py-1 cursor-pointer bg-transparent border-0"
            >
              <span>Ver todas mis citas anteriores</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </section>

        <!-- Soporte y Campus HIC / FCV -->
        <footer class="mt-2 rounded-2xl bg-surface-container-low p-4 flex flex-col gap-2 border border-outline-variant/30">
          <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[18px]">support_agent</span>
            <span class="text-[13px] font-semibold">Asistencia y Soporte HIC | FCV</span>
          </div>
          <div class="flex flex-col gap-1 text-on-surface-variant text-[12px]">
            <p class="leading-relaxed">
              <strong class="text-on-surface font-semibold">Campus HIC:</strong> Km 7 Autopista Bucaramanga - Piedecuesta.
            </p>
            <div class="flex items-center gap-2 text-primary pt-0.5">
              <span class="material-symbols-outlined text-[16px]">call</span>
              <a href="tel:6076392828" class="text-[13px] font-semibold text-secondary hover:underline">(607) 639-2828</a>
              <span class="text-outline">·</span>
              <span class="text-on-surface-variant text-[11px]">Atención 24/7</span>
            </div>
          </div>
        </footer>

      </div>
    </main>

    <!-- Modal de Preparación de la Cita Médica -->
    @if (selectedCita(); as cita) {
      <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
        <div class="w-full max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl p-6 shadow-xl flex flex-col gap-4 border border-outline-variant/40 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">medical_information</span>
              </div>
              <div class="flex flex-col">
                <h3 class="text-[15px] font-semibold text-primary">Instrucciones de Preparación</h3>
                <span class="text-[11px] text-on-surface-variant">{{ cita.specialty }}</span>
              </div>
            </div>
            <button
              type="button"
              (click)="closePreparation()"
              class="p-1.5 text-outline hover:text-on-surface rounded-full cursor-pointer bg-transparent border-0"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div class="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
            <div class="flex items-center gap-2 text-primary text-[13px] font-semibold mb-1">
              <span class="material-symbols-outlined text-[16px]">schedule</span>
              <span>{{ cita.date }} - {{ cita.time }}</span>
            </div>
            <p class="text-[12px] text-on-surface-variant">
              {{ cita.doctorName }} · {{ cita.sede }}
            </p>
          </div>

          <div class="flex flex-col gap-2.5">
            <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Recomendaciones obligatorias previas:
            </span>
            <ul class="flex flex-col gap-2">
              @for (item of cita.preparation; track item; let i = $index) {
                <li class="flex items-start gap-2.5 text-[13px] text-on-surface leading-snug">
                  <span class="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {{ i + 1 }}
                  </span>
                  <span>{{ item }}</span>
                </li>
              }
            </ul>
          </div>

          <div class="mt-2 pt-3 border-t border-outline-variant/30 flex gap-2">
            <button
              type="button"
              (click)="addToCalendar(cita)"
              class="flex-1 h-10 rounded-lg bg-surface-container text-secondary text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors cursor-pointer border-0"
            >
              <span class="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Guardar recordatorio</span>
            </button>
            <button
              type="button"
              (click)="closePreparation()"
              class="h-10 px-4 rounded-lg bg-primary-container text-white text-[13px] font-semibold hover:bg-primary transition-colors cursor-pointer border-0"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal de Preguntas Frecuentes / Ayuda -->
    @if (showFaqModal()) {
      <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div class="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4 border border-outline-variant/40">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[22px]">help</span>
              <h3 class="text-base font-semibold text-primary">¿Cómo solicitar tu cita?</h3>
            </div>
            <button
              type="button"
              (click)="toggleFaqModal()"
              class="p-1 text-outline hover:text-on-surface rounded-full cursor-pointer bg-transparent border-0"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div class="flex flex-col gap-3 text-[13px] text-on-surface leading-relaxed">
            <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <p class="font-semibold text-primary mb-0.5">1. Selecciona la especialidad médica</p>
              <p class="text-on-surface-variant text-[12px]">Disponemos de más de 40 subespecialidades pediátricas y de adultos.</p>
            </div>
            <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <p class="font-semibold text-primary mb-0.5">2. Elige el campus de atención</p>
              <p class="text-on-surface-variant text-[12px]">Hospital Internacional de Colombia (HIC) o Instituto Cardiovascular FCV en Floridablanca.</p>
            </div>
            <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <p class="font-semibold text-primary mb-0.5">3. Elige tu fecha y horario preferido</p>
              <p class="text-on-surface-variant text-[12px]">Consulta la disponibilidad en tiempo real de los médicos especialistas.</p>
            </div>
          </div>

          <button
            type="button"
            (click)="toggleFaqModal(); goToBooking();"
            class="w-full h-10 rounded-lg bg-primary-container text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-0"
          >
            <span>Ir a solicitar cita</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    }

    <!-- Toast de Notificación de Calendario -->
    @if (calendarToast()) {
      <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#002042] text-white px-4 py-2.5 rounded-full shadow-lg text-[13px] flex items-center gap-2 border border-secondary/50 animate-bounce">
        <span class="material-symbols-outlined text-secondary-container text-[18px]">check_circle</span>
        <span>Cita sincronizada con tu calendario con éxito</span>
      </div>
    }
  `
})
export class DashboardComponent {
  readonly portalService = inject(PortalService);
  readonly logoImg = HIC_LOGO_IMG;

  readonly patient = this.portalService.activePatient;
  readonly upcomingCount = () => this.portalService.upcomingCitas().length;
  readonly pastCount = () => this.portalService.pastCitas().length;
  readonly nextCita = this.portalService.nextUpcomingCita;
  readonly recentPastCitas = () => this.portalService.pastCitas().slice(0, 2);

  readonly selectedCita = signal<Cita | null>(null);
  readonly showFaqModal = signal<boolean>(false);
  readonly calendarToast = signal<boolean>(false);

  toggleEmptyState() {
    this.portalService.toggleEmptyState();
  }

  goToBooking() {
    this.portalService.setScreen('solicitar');
  }

  goToMyAppointments() {
    this.portalService.setScreen('mis-citas');
  }

  goToProfile() {
    this.portalService.setScreen('perfil');
  }

  openPreparation(cita: Cita) {
    this.selectedCita.set(cita);
  }

  closePreparation() {
    this.selectedCita.set(null);
  }

  toggleFaqModal() {
    this.showFaqModal.update((v) => !v);
  }

  addToCalendar(cita?: Cita) {
    if (cita) {
      void cita.id;
    }
    this.calendarToast.set(true);
    setTimeout(() => {
      this.calendarToast.set(false);
    }, 3000);
  }
}
