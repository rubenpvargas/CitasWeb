import { Injectable, signal, computed, effect, inject, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cita, PatientUser } from '../models/portal.types';
import { AppConfigService } from '../core/config/app-config.service';
import { SessionStore } from '../core/auth/session.store';
import { LEGACY_MOCK_CITAS } from './legacy-mock';

export { HIC_BUILDING_IMG, HIC_LOGO_IMG, DR_HERRERA_PHOTO } from './legacy-mock';

/**
 * Estado de las pantallas de portal (inicio, reserva, citas, perfil). La
 * navegación vive en el Router y la identidad en `SessionStore`; los datos de
 * médicos/citas siguen siendo los sintéticos heredados hasta las HU de agenda.
 */
@Injectable({
  providedIn: 'root',
})
export class PortalService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private readonly session = inject(SessionStore);
  readonly emptyStateSimulated = signal<boolean>(false);

  /** Identidad visible derivada del `user` de la respuesta de login. */
  readonly activePatient = computed<PatientUser>(() => {
    const user = this.session.user();
    return {
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      docType: '',
      docNumber: '',
      email: user?.email ?? '',
      phone: '',
      avatarUrl: '',
    };
  });

  readonly citas = signal<Cita[]>(LEGACY_MOCK_CITAS);

  // Selected appointment for details/preparation modal
  readonly selectedCitaForPrep = signal<Cita | null>(null);

  constructor() {
    // Al cerrar o expirar la sesión no se conservan datos del usuario anterior (HU-003).
    effect(() => {
      if (this.session.isAuthenticated()) return;
      untracked(() => this.resetUserState());
    });
  }

  /** Descarta los datos cargados para el usuario de la sesión. */
  resetUserState() {
    this.citas.set(LEGACY_MOCK_CITAS);
    this.selectedCitaForPrep.set(null);
    this.emptyStateSimulated.set(false);
  }

  // Computed views
  readonly upcomingCitas = computed(() => {
    if (this.emptyStateSimulated()) return [];
    return this.citas().filter((c) => c.status === 'Confirmada');
  });

  readonly pastCitas = computed(() => {
    return this.citas().filter((c) => c.status === 'Atendida');
  });

  readonly cancelledCitas = computed(() => {
    return this.citas().filter((c) => c.status === 'Cancelada');
  });

  readonly nextUpcomingCita = computed(() => {
    const list = this.upcomingCitas();
    return list.length > 0 ? list[0] : null;
  });

  loadAppointments() {
    this.http.get<Record<string, unknown>[]>(this.config.url('/api/v1/appointments')).subscribe({
      next: (items) => this.citas.set(items.map((item) => this.toCita(item))),
      error: () => undefined,
    });
  }

  toggleEmptyState() {
    this.emptyStateSimulated.update((v) => !v);
  }

  openPreparation(cita: Cita) {
    this.selectedCitaForPrep.set(cita);
  }

  closePreparation() {
    this.selectedCitaForPrep.set(null);
  }

  cancelAppointment(id: string) {
    this.http.post<void>(this.config.url(`/api/v1/appointments/${id}/cancel`), {}).subscribe({
      next: () => this.citas.update((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'Cancelada' } : c))),
      error: () => undefined,
    });
  }

  private toCita(item: Record<string, unknown>): Cita {
    const start = new Date(String(item['startAt']));
    return {
      id: String(item['id']),
      specialty: String(item['specialtyName'] ?? 'Consulta'),
      doctorName: `${String(item['professionalFirstName'] ?? '')} ${String(item['professionalLastName'] ?? '')}`.trim(),
      date: start.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      time: start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      arrivalNotice: 'Llegar 20 min antes',
      modality: 'Presencial',
      sede: String(item['locationName'] ?? item['locationCode'] ?? ''),
      locationDetails: String(item['locationName'] ?? ''),
      status: this.toUiStatus(String(item['status'] ?? 'REQUESTED')),
      icon: 'event',
      preparation: ['Presentar documento de identidad.', 'Llegar con anticipación.'],
    };
  }

  private toUiStatus(status: string): Cita['status'] {
    if (status === 'APPROVED') return 'Confirmada';
    if (status === 'CANCELLED') return 'Cancelada';
    return 'Atendida';
  }
}
