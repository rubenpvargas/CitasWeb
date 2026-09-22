import { Injectable, signal, computed } from '@angular/core';
import { Cita, Doctor, PatientUser, ScreenType } from '../models/portal.types';

export const HIC_BUILDING_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpJ7HSVkmsFGQMu5P-6NsAjYEb81sDHWBXRi3cI9kBvdOEr-DS5vQOCodF4Nje417_2TlRBsxMNB8daSR1v8VopUKk7A3hIe2ZGYKUTVXBzT4-Jp7Wl6RuSNP0dEWvyXeeuisZmQEHlYJ86Is6CoYi0Pwkhs89yLWw7atNzVcZ9Ma36oWmvigeRYScX9FmJYO7Ye82Qs6ABLyLT09ClbmBuFx-3mQ3k8bPxv2R1cKCwriPy1ABG04lWA';

export const HIC_LOGO_IMG = 'https://lh3.googleusercontent.com/aida/AEtjO1WTrMpLS8jjbEAmi84opFVpxoT3gnhodtawtqPe3Kzp4jz5OpUAZp8SUhfj85MLurnbZKSEYkeULgid_d_iRYbU6bI5m_qOcc_cvWl8YW2dtRaH-M-Qnbvymco2LyMp2ZuyzvUqAgT3s9S0zlK18DzYSxrSM91Pma9LrwoiZbnxz_Jmfg3BoxqMDDlFGuLIhnYBf5izEvDLFoAhf3ck1bQ0YbpNCwVEGyYMjR13KgEnFB9eF2VZA67wpF6p';

export const DR_HERRERA_PHOTO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj9KBtCaJ17U8rmSpZUVF9SIrhWw2Imn8kw2UrU-SyHon8B0fosJPm5kyn4RI_FJgM01p8rLTRScq92PbjZimoqDeUQIkoaJdegcYVBEYCXXWFRC0neI3xw7EKzEbCEWsHYqE00lWzPy_5nLDG8I8N1F2BxXF5LWuGJ2zUtGEkYTC7Dk7-s7lXb_8-4kgET0XJ0kqERosI5dHTbBNJUSIH6eI77Cs0q85t2hthhZSo2zfZT2d0ZiHv2g';

@Injectable({
  providedIn: 'root',
})
export class PortalService {
  readonly currentScreen = signal<ScreenType>('login');
  readonly isAuthenticated = signal<boolean>(false);
  readonly emptyStateSimulated = signal<boolean>(false);

  readonly activePatient = signal<PatientUser>({
    fullName: 'Ana Martínez Silva',
    firstName: 'Ana',
    lastName: 'Martínez Silva',
    docType: 'CC',
    docNumber: '1098765432',
    email: 'paciente@fcv.org',
    phone: '300 123 4567',
    avatarUrl: DR_HERRERA_PHOTO,
  });

  readonly doctors = signal<Doctor[]>([
    {
      id: 'dr-herrera',
      name: 'Dra. Valentina Herrera',
      specialty: 'Cardiología Adultos',
      subspecialty: 'Ecocardiografía e Insuficiencia Cardíaca',
      sede: 'HIC',
      room: 'Torre Médica A, Piso 4, Consultorio 410',
      rating: 4.9,
      availableDays: ['Lunes', 'Miércoles', 'Jueves', 'Viernes'],
      photoUrl: DR_HERRERA_PHOTO,
    },
    {
      id: 'dr-silva',
      name: 'Dr. Roberto Silva Gómez',
      specialty: 'Cardiología Adultos',
      subspecialty: 'Cardiología Intervencionista',
      sede: 'HIC',
      room: 'Torre Médica A, Piso 4, Consultorio 412',
      rating: 4.95,
      availableDays: ['Martes', 'Jueves', 'Sábado'],
    },
    {
      id: 'dr-morales',
      name: 'Dra. Claudia Morales',
      specialty: 'Medicina Interna',
      subspecialty: 'Manejo Crónico y Medicina Preventiva',
      sede: 'HIC',
      room: 'Torre Médica B, Piso 3, Consultorio 305',
      rating: 4.88,
      availableDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves'],
    },
    {
      id: 'dr-pena',
      name: 'Dr. Fernando Peña',
      specialty: 'Oftalmología',
      subspecialty: 'Retina y Cirugía Refractiva',
      sede: 'FCV',
      room: 'Pabellón El Bosque, Consultorio 114',
      rating: 4.92,
      availableDays: ['Lunes', 'Miércoles', 'Viernes'],
    },
    {
      id: 'dr-caicedo',
      name: 'Dr. Andrés Caicedo',
      specialty: 'Neurología Clínica',
      subspecialty: 'Neurofisiología y Trastornos del Sueño',
      sede: 'HIC',
      room: 'Torre Médica A, Piso 5, Consultorio 502',
      rating: 4.87,
      availableDays: ['Martes', 'Jueves'],
    },
  ]);

  readonly citas = signal<Cita[]>([
    {
      id: 'cita-1',
      specialty: 'Cardiología Adultos',
      doctorName: 'Dr. Roberto Silva Gómez',
      date: 'Jueves, 24 de Octubre, 2024',
      time: '09:30 AM',
      arrivalNotice: 'Llegar 20 min antes',
      modality: 'Presencial',
      sede: 'Hospital Internacional de Colombia (HIC)',
      locationDetails: 'Torre Médica A, Piso 4, Consultorio 412 · Piedecuesta',
      status: 'Confirmada',
      icon: 'cardiology',
      preparation: [
        'Presentar documento de identidad original (Cédula de Ciudadanía).',
        'Llevar orden médica de autorización vigente emitida por su asegurador o EPS.',
        'Ayuno ligero de 2 horas previas en caso de pruebas diagnósticas complementarias.',
        'Llevar lista actualizada de medicamentos que toma habitualmente con dosis.',
      ],
    },
    {
      id: 'cita-2',
      specialty: 'Medicina Interna',
      doctorName: 'Dra. Claudia Morales',
      date: '12 Sep 2024',
      time: '11:00 AM',
      arrivalNotice: 'Atendida en horario',
      modality: 'Presencial',
      sede: 'Hospital Internacional de Colombia (HIC)',
      locationDetails: 'Torre Médica B, Piso 3, Consultorio 305',
      status: 'Atendida',
      icon: 'stethoscope',
      preparation: ['Control semestral completado con satisfacción.'],
    },
    {
      id: 'cita-3',
      specialty: 'Oftalmología',
      doctorName: 'Dr. Fernando Peña',
      date: '18 Jun 2024',
      time: '03:15 PM',
      arrivalNotice: 'Atendida en horario',
      modality: 'Presencial',
      sede: 'Instituto Cardiovascular FCV',
      locationDetails: 'Pabellón El Bosque, Consultorio 114 · Floridablanca',
      status: 'Atendida',
      icon: 'visibility',
      preparation: ['Examen de agudeza visual y fondo de ojo finalizado.'],
    },
    {
      id: 'cita-4',
      specialty: 'Neurología Clínica',
      doctorName: 'Dr. Andrés Caicedo',
      date: '15 Feb 2024',
      time: '10:00 AM',
      arrivalNotice: 'Atendida en horario',
      modality: 'Presencial',
      sede: 'Hospital Internacional de Colombia (HIC)',
      locationDetails: 'Torre Médica A, Piso 5, Consultorio 502',
      status: 'Atendida',
      icon: 'neurology',
      preparation: ['Revisión neurológica periódica.'],
    },
  ]);

  // Selected appointment for details/preparation modal
  readonly selectedCitaForPrep = signal<Cita | null>(null);

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

  // Action methods
  setScreen(screen: ScreenType) {
    this.currentScreen.set(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.citas.update((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Cancelada' } : c))
    );
  }

  addNewAppointment(newCita: Omit<Cita, 'id'>) {
    const cita: Cita = {
      ...newCita,
      id: 'cita-' + Date.now(),
    };
    this.citas.update((prev) => [cita, ...prev]);
    this.emptyStateSimulated.set(false);
  }
}
