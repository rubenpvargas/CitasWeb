import { Role } from '../../core/api/api.types';

export interface OperationsLink {
  path: string;
  label: string;
  icon: string;
  roles: readonly Role[];
}

/** Secciones de operación por rol (solo UX; el backend autoriza cada endpoint). */
export const OPERATIONS_LINKS: readonly OperationsLink[] = [
  { path: 'bandeja', label: 'Bandeja', icon: 'inbox', roles: ['ADMIN'] },
  { path: 'eps', label: 'EPS y planes', icon: 'health_and_safety', roles: ['ADMIN'] },
  { path: 'especialidades', label: 'Especialidades', icon: 'stethoscope', roles: ['ADMIN'] },
  { path: 'profesionales', label: 'Profesionales', icon: 'badge', roles: ['ADMIN'] },
  { path: 'agenda', label: 'Agenda', icon: 'calendar_month', roles: ['PROFESSIONAL'] },
];

/** Ruta inicial de /operacion según el rol. */
export function operationsHome(roles: readonly string[]): string {
  return roles.includes('ADMIN') ? 'bandeja' : 'agenda';
}
