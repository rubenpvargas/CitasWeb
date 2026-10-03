/** Etiquetas de UI por estado de cita del backend (`appointment_statuses`). */
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Pendiente de aprobación',
  APPROVED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Atendida',
  NO_SHOW: 'No asistió',
};

export function appointmentStatusLabel(status: string | null | undefined): string {
  return (status && APPOINTMENT_STATUS_LABELS[status]) || 'Estado desconocido';
}
