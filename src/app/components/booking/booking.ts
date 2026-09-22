import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { PortalService } from '../../services/portal.service';
import { Doctor } from '../../models/portal.types';

@Component({
  selector: 'app-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header Fijo Superior -->
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="p-1 text-primary hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
            title="Volver"
          >
            <span class="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold text-primary tracking-tight leading-none">Solicitar Cita Médica</span>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">HIC &bull; FCV Especialistas</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-secondary text-[11px] font-semibold border border-outline-variant/30">
          <span class="material-symbols-outlined text-[14px]">verified</span>
          <span>Cupos en tiempo real</span>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-28 bg-surface">
      <div class="flex flex-col w-full gap-5">

        <!-- Paso 1: Especialidad -->
        <section class="flex flex-col gap-2">
          <h3 class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold">1</span>
            <span>Especialidad requerida</span>
          </h3>
          <div class="grid grid-cols-2 gap-2">
            @for (esp of specialties; track esp.name) {
              <button
                type="button"
                (click)="selectSpecialty(esp.name, esp.icon)"
                [class.bg-primary-container]="selectedSpecialty() === esp.name"
                [class.text-white]="selectedSpecialty() === esp.name"
                [class.bg-surface-container-lowest]="selectedSpecialty() !== esp.name"
                [class.text-on-surface]="selectedSpecialty() !== esp.name"
                class="p-3 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col items-start text-left gap-1.5 transition-all cursor-pointer hover:border-secondary"
              >
                <div
                  [class.text-white]="selectedSpecialty() === esp.name"
                  [class.text-secondary]="selectedSpecialty() !== esp.name"
                  class="w-7 h-7 rounded-lg bg-surface-container/60 flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-[18px]">{{ esp.icon }}</span>
                </div>
                <span class="text-[13px] font-semibold leading-tight">{{ esp.name }}</span>
                <span class="text-[11px] opacity-75">{{ esp.sub }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Paso 2: Sede Hospitalaria -->
        <section class="flex flex-col gap-2">
          <h3 class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold">2</span>
            <span>Sede de atención</span>
          </h3>
          <div class="flex flex-col gap-2">
            <button
              type="button"
              (click)="selectedSede.set('Hospital Internacional de Colombia (HIC)')"
              [class.border-secondary]="selectedSede() === 'Hospital Internacional de Colombia (HIC)'"
              [class.bg-[#f2f3ff]]="selectedSede() === 'Hospital Internacional de Colombia (HIC)'"
              class="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-start gap-3 text-left transition-all cursor-pointer hover:border-secondary"
            >
              <div class="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs">
                <span class="material-symbols-outlined text-[20px]">local_hospital</span>
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <span class="text-[14px] font-semibold text-primary">Campus HIC (Piedecuesta)</span>
                <span class="text-[12px] text-on-surface-variant">Km 7 Autopista Bucaramanga - Alta Complejidad</span>
              </div>
              <div class="w-5 h-5 rounded-full border border-outline-variant flex items-center justify-center shrink-0 mt-0.5"
                   [class.bg-secondary]="selectedSede() === 'Hospital Internacional de Colombia (HIC)'">
                @if (selectedSede() === 'Hospital Internacional de Colombia (HIC)') {
                  <span class="material-symbols-outlined text-[14px] text-white">check</span>
                }
              </div>
            </button>

            <button
              type="button"
              (click)="selectedSede.set('Instituto Cardiovascular FCV')"
              [class.border-secondary]="selectedSede() === 'Instituto Cardiovascular FCV'"
              [class.bg-[#f2f3ff]]="selectedSede() === 'Instituto Cardiovascular FCV'"
              class="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-start gap-3 text-left transition-all cursor-pointer hover:border-secondary"
            >
              <div class="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0 shadow-xs">
                <span class="material-symbols-outlined text-[20px]">cardiology</span>
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <span class="text-[14px] font-semibold text-primary">Instituto Cardiovascular FCV</span>
                <span class="text-[12px] text-on-surface-variant">Calle 155A # 23-58, El Bosque, Floridablanca</span>
              </div>
              <div class="w-5 h-5 rounded-full border border-outline-variant flex items-center justify-center shrink-0 mt-0.5"
                   [class.bg-secondary]="selectedSede() === 'Instituto Cardiovascular FCV'">
                @if (selectedSede() === 'Instituto Cardiovascular FCV') {
                  <span class="material-symbols-outlined text-[14px] text-white">check</span>
                }
              </div>
            </button>
          </div>
        </section>

        <!-- Paso 3: Médico Especialista -->
        <section class="flex flex-col gap-2">
          <h3 class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold">3</span>
            <span>Especialista disponible</span>
          </h3>
          <div class="flex flex-col gap-2">
            @for (doc of availableDoctors(); track doc.id) {
              <button
                type="button"
                (click)="selectedDoctor.set(doc)"
                [class.border-secondary]="selectedDoctor()?.id === doc.id"
                [class.bg-surface-container-low]="selectedDoctor()?.id === doc.id"
                class="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-xs flex items-center gap-3 text-left transition-all cursor-pointer hover:border-secondary"
              >
                @if (doc.photoUrl) {
                  <img
                    [src]="doc.photoUrl"
                    [alt]="doc.name"
                    class="w-12 h-12 rounded-full object-cover border-2 border-secondary/40 shrink-0"
                    referrerpolicy="no-referrer"
                  />
                } @else {
                  <div class="w-12 h-12 rounded-full bg-surface-container text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {{ doc.name.charAt(4) }}{{ doc.name.charAt(12) }}
                  </div>
                }
                <div class="flex flex-col min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[14px] font-semibold text-primary truncate">{{ doc.name }}</span>
                    <span class="text-[11px] text-amber-600 flex items-center gap-0.5 font-medium shrink-0">
                      <span class="material-symbols-outlined text-[13px]">star</span>
                      {{ doc.rating }}
                    </span>
                  </div>
                  <span class="text-[12px] text-on-surface-variant truncate">{{ doc.subspecialty }}</span>
                  <span class="text-[11px] text-secondary font-medium mt-0.5">{{ doc.room }}</span>
                </div>
                <div class="w-5 h-5 rounded-full border border-outline-variant flex items-center justify-center shrink-0"
                     [class.bg-secondary]="selectedDoctor()?.id === doc.id">
                  @if (selectedDoctor()?.id === doc.id) {
                    <span class="material-symbols-outlined text-[14px] text-white">check</span>
                  }
                </div>
              </button>
            }
          </div>
        </section>

        <!-- Paso 4: Modalidad y Fecha -->
        <section class="flex flex-col gap-2">
          <h3 class="text-[13px] font-semibold text-primary flex items-center gap-2 m-0">
            <span class="w-5 h-5 rounded-full bg-primary-container text-white text-[11px] flex items-center justify-center font-bold">4</span>
            <span>Modalidad y horario</span>
          </h3>
          
          <div class="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              (click)="selectedModality.set('Presencial')"
              [class.bg-primary-container]="selectedModality() === 'Presencial'"
              [class.text-white]="selectedModality() === 'Presencial'"
              [class.bg-surface-container-lowest]="selectedModality() !== 'Presencial'"
              class="py-2.5 px-3 rounded-lg border border-outline-variant/40 shadow-xs flex items-center justify-center gap-2 text-[13px] font-semibold cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">domain</span>
              <span>Presencial en sede</span>
            </button>
            <button
              type="button"
              (click)="selectedModality.set('Teleconsulta')"
              [class.bg-primary-container]="selectedModality() === 'Teleconsulta'"
              [class.text-white]="selectedModality() === 'Teleconsulta'"
              [class.bg-surface-container-lowest]="selectedModality() !== 'Teleconsulta'"
              class="py-2.5 px-3 rounded-lg border border-outline-variant/40 shadow-xs flex items-center justify-center gap-2 text-[13px] font-semibold cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">videocam</span>
              <span>Teleconsulta virtual</span>
            </button>
          </div>

          <!-- Selector de Fechas Disponibles -->
          <div class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col gap-2.5">
            <span class="text-[12px] text-on-surface-variant font-medium">Días disponibles:</span>
            <div class="grid grid-cols-3 gap-2">
              @for (date of availableDates; track date.full) {
                <button
                  type="button"
                  (click)="selectedDate.set(date.full)"
                  [class.border-secondary]="selectedDate() === date.full"
                  [class.bg-secondary-container/20]="selectedDate() === date.full"
                  class="p-2.5 rounded-lg border border-outline-variant/40 text-center flex flex-col items-center cursor-pointer hover:border-secondary transition-all"
                >
                  <span class="text-[11px] text-on-surface-variant">{{ date.weekday }}</span>
                  <span class="text-base font-bold text-primary">{{ date.day }}</span>
                  <span class="text-[11px] text-secondary font-medium">{{ date.month }}</span>
                </button>
              }
            </div>

            <!-- Fichas de Horarios -->
            <span class="text-[12px] text-on-surface-variant font-medium mt-1">Horarios de consulta:</span>
            <div class="grid grid-cols-4 gap-1.5">
              @for (time of availableTimes; track time) {
                <button
                  type="button"
                  (click)="selectedTime.set(time)"
                  [class.bg-primary-container]="selectedTime() === time"
                  [class.text-white]="selectedTime() === time"
                  [class.border-primary-container]="selectedTime() === time"
                  [class.bg-surface-container-low]="selectedTime() !== time"
                  [class.text-on-surface]="selectedTime() !== time"
                  class="py-2 px-1 text-center rounded-lg border border-outline-variant/30 text-[12px] font-semibold cursor-pointer hover:border-primary-container transition-all"
                >
                  {{ time }}
                </button>
              }
            </div>
          </div>
        </section>

        <!-- Resumen de Confirmación -->
        <section class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-xs flex flex-col gap-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <span class="text-[13px] font-bold text-primary uppercase tracking-wide">Resumen del Agendamiento</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Cita Asistencial</span>
          </div>

          <div class="flex flex-col gap-1 text-[13px]">
            <p><strong class="text-primary">Especialidad:</strong> {{ selectedSpecialty() }}</p>
            <p><strong class="text-primary">Especialista:</strong> {{ selectedDoctor()?.name }}</p>
            <p><strong class="text-primary">Lugar:</strong> {{ selectedSede() }}</p>
            <p><strong class="text-primary">Fecha y Hora:</strong> {{ selectedDate() }} a las {{ selectedTime() }}</p>
            <p><strong class="text-primary">Modalidad:</strong> {{ selectedModality() }}</p>
          </div>

          <div class="pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              (click)="confirmBooking()"
              [disabled]="bookingLoading()"
              class="w-full h-12 rounded-xl bg-primary-container text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-primary active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-75"
            >
              @if (bookingLoading()) {
                <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span>Confirmando cita médica...</span>
              } @else {
                <span class="material-symbols-outlined text-[18px]">event_available</span>
                <span>Confirmar y agendar cita</span>
              }
            </button>
          </div>
        </section>

      </div>
    </main>

    <!-- Modal Éxito de Agendamiento -->
    @if (bookingSuccess()) {
      <div class="fixed inset-0 z-50 bg-[#283044]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div class="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col items-center text-center border border-outline-variant/40">
          <div class="w-16 h-16 rounded-full bg-[#89f5e7] flex items-center justify-center text-[#003d37] mb-4 shadow-xs">
            <span class="material-symbols-outlined text-[36px]">check_circle</span>
          </div>
          <h2 class="text-xl text-primary font-semibold tracking-tight mb-1">
            ¡Cita agendada con éxito!
          </h2>
          <p class="text-[13px] text-on-surface-variant mb-4 leading-relaxed">
            Tu cita para <strong>{{ selectedSpecialty() }}</strong> con el <strong>{{ selectedDoctor()?.name }}</strong> ha sido confirmada en tu historial.
          </p>
          <div class="w-full bg-surface-container-low p-3 rounded-xl mb-4 text-left text-[12px] text-on-surface-variant">
            <p class="font-semibold text-primary">{{ selectedDate() }} · {{ selectedTime() }}</p>
            <p>{{ selectedSede() }}</p>
          </div>
          <button
            type="button"
            (click)="finishAndGoDashboard()"
            class="w-full h-11 rounded-lg bg-primary-container text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-xs hover:bg-primary transition-all cursor-pointer border-0"
          >
            <span>Ver en Inicio</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    }
  `
})
export class BookingComponent {
  private readonly portalService = inject(PortalService);

  readonly specialties = [
    { name: 'Cardiología Adultos', sub: 'Alta complejidad', icon: 'cardiology' },
    { name: 'Medicina Interna', sub: 'Control y diagnóstico', icon: 'stethoscope' },
    { name: 'Oftalmología', sub: 'Retina y visión', icon: 'visibility' },
    { name: 'Neurología Clínica', sub: 'Cerebro y nervios', icon: 'neurology' },
  ];

  readonly selectedSpecialty = signal<string>('Cardiología Adultos');
  readonly selectedSpecialtyIcon = signal<string>('cardiology');
  readonly selectedSede = signal<string>('Hospital Internacional de Colombia (HIC)');
  readonly selectedModality = signal<'Presencial' | 'Teleconsulta'>('Presencial');
  readonly selectedDoctor = signal<Doctor | null>(null);

  readonly availableDates = [
    { weekday: 'Jue', day: '24', month: 'Oct', full: 'Jueves, 24 de Octubre, 2024' },
    { weekday: 'Vie', day: '25', month: 'Oct', full: 'Viernes, 25 de Octubre, 2024' },
    { weekday: 'Lun', day: '28', month: 'Oct', full: 'Lunes, 28 de Octubre, 2024' },
  ];
  readonly selectedDate = signal<string>('Jueves, 24 de Octubre, 2024');

  readonly availableTimes = ['08:00 AM', '09:30 AM', '11:00 AM', '02:30 PM', '03:45 PM', '04:30 PM', '05:15 PM'];
  readonly selectedTime = signal<string>('09:30 AM');

  readonly bookingLoading = signal<boolean>(false);
  readonly bookingSuccess = signal<boolean>(false);

  constructor() {
    const docs = this.portalService.doctors();
    if (docs.length > 0) {
      this.selectedDoctor.set(docs[0]);
    }
  }

  readonly availableDoctors = computed(() => {
    const esp = this.selectedSpecialty();
    const all = this.portalService.doctors();
    const filtered = all.filter((d) => d.specialty === esp);
    return filtered.length > 0 ? filtered : all;
  });

  selectSpecialty(name: string, icon: string) {
    this.selectedSpecialty.set(name);
    this.selectedSpecialtyIcon.set(icon);
    const docs = this.availableDoctors();
    if (docs.length > 0) {
      this.selectedDoctor.set(docs[0]);
    }
  }

  confirmBooking() {
    this.bookingLoading.set(true);
    setTimeout(() => {
      this.bookingLoading.set(false);
      this.bookingSuccess.set(true);

      const doc = this.selectedDoctor();
      this.portalService.addNewAppointment({
        specialty: this.selectedSpecialty(),
        doctorName: doc ? doc.name : 'Dr. Roberto Silva Gómez',
        doctorPhoto: doc?.photoUrl,
        date: this.selectedDate(),
        time: this.selectedTime(),
        arrivalNotice: 'Llegar 20 min antes',
        modality: this.selectedModality(),
        sede: this.selectedSede(),
        locationDetails: doc ? doc.room : 'Torre Médica A, Piso 4',
        status: 'Confirmada',
        icon: this.selectedSpecialtyIcon(),
        preparation: [
          'Documento de identidad original en físico.',
          'Orden médica emitida por tu EPS o aseguradora.',
          'Resultados de paraclínicos o imágenes recientes.',
          'Ayuno de 3 horas si requiere toma de muestras adicionales.',
        ],
      });
    }, 800);
  }

  finishAndGoDashboard() {
    this.bookingSuccess.set(false);
    this.portalService.setScreen('dashboard');
  }

  goBack() {
    this.portalService.setScreen('dashboard');
  }
}
