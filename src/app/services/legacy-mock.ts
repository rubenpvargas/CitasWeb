/**
 * Datos sintéticos heredados del prototipo de AI Studio. Las pantallas de
 * inicio y citas los usarán hasta que sus HU (olas posteriores)
 * consuman la API real. No contienen datos reales de FCV.
 */
import { Cita } from '../models/portal.types';

export const HIC_BUILDING_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpJ7HSVkmsFGQMu5P-6NsAjYEb81sDHWBXRi3cI9kBvdOEr-DS5vQOCodF4Nje417_2TlRBsxMNB8daSR1v8VopUKk7A3hIe2ZGYKUTVXBzT4-Jp7Wl6RuSNP0dEWvyXeeuisZmQEHlYJ86Is6CoYi0Pwkhs89yLWw7atNzVcZ9Ma36oWmvigeRYScX9FmJYO7Ye82Qs6ABLyLT09ClbmBuFx-3mQ3k8bPxv2R1cKCwriPy1ABG04lWA';

export const HIC_LOGO_IMG = 'https://lh3.googleusercontent.com/aida/AEtjO1WTrMpLS8jjbEAmi84opFVpxoT3gnhodtawtqPe3Kzp4jz5OpUAZp8SUhfj85MLurnbZKSEYkeULgid_d_iRYbU6bI5m_qOcc_cvWl8YW2dtRaH-M-Qnbvymco2LyMp2ZuyzvUqAgT3s9S0zlK18DzYSxrSM91Pma9LrwoiZbnxz_Jmfg3BoxqMDDlFGuLIhnYBf5izEvDLFoAhf3ck1bQ0YbpNCwVEGyYMjR13KgEnFB9eF2VZA67wpF6p';

export const DR_HERRERA_PHOTO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj9KBtCaJ17U8rmSpZUVF9SIrhWw2Imn8kw2UrU-SyHon8B0fosJPm5kyn4RI_FJgM01p8rLTRScq92PbjZimoqDeUQIkoaJdegcYVBEYCXXWFRC0neI3xw7EKzEbCEWsHYqE00lWzPy_5nLDG8I8N1F2BxXF5LWuGJ2zUtGEkYTC7Dk7-s7lXb_8-4kgET0XJ0kqERosI5dHTbBNJUSIH6eI77Cs0q85t2hthhZSo2zfZT2d0ZiHv2g';

export const LEGACY_MOCK_CITAS: Cita[] = [
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
];
