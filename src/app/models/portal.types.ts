export type ScreenType = 
  | 'login' 
  | 'registro' 
  | 'recuperar' 
  | 'reset-password' 
  | 'dashboard' 
  | 'solicitar' 
  | 'mis-citas' 
  | 'perfil';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  subspecialty?: string;
  sede: 'HIC' | 'FCV' | 'Ambas';
  room: string;
  rating: number;
  availableDays: string[];
  photoUrl?: string;
}

export interface Cita {
  id: string;
  specialty: string;
  doctorName: string;
  doctorPhoto?: string;
  date: string; // e.g. "Jueves, 24 de Octubre, 2024"
  time: string; // e.g. "09:30 AM"
  arrivalNotice: string; // e.g. "Llegar 20 min antes"
  modality: 'Presencial' | 'Teleconsulta';
  sede: string; // e.g. "Hospital Internacional de Colombia (HIC)"
  locationDetails: string; // e.g. "Torre Médica A, Piso 4, Consultorio 412 · Piedecuesta"
  status: 'Confirmada' | 'Atendida' | 'Cancelada';
  preparation: string[];
  icon: string;
}

export interface PatientUser {
  fullName: string;
  firstName: string;
  lastName: string;
  docType: string;
  docNumber: string;
  email: string;
  phone: string;
  avatarUrl: string;
}
