import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { AppointmentDto } from './availability.api';

export interface AppointmentFilters {
  status?: string | null;
  from?: string | null;
  to?: string | null;
}

/** HU-021 `POST /appointments/{id}/reschedule`. */
export interface RescheduleRequest {
  startAt: string;
  locationCode: string;
}

/** HU-021 respuesta `201`. */
export interface RescheduleResponse {
  id: number;
  appointmentId: number;
  status: 'PENDING' | string;
  requestedStartAt: string;
  requestedEndAt: string;
  locationCode: string;
}

/** Cliente REST de "Mis citas" (Ola E). Solo citas propias (ownership por `sub`). */
@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  list(filters: AppointmentFilters = {}): Observable<AppointmentDto[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<AppointmentDto[]>(this.config.url('/api/v1/appointments'), { params });
  }

  get(id: number): Observable<AppointmentDto> {
    return this.http.get<AppointmentDto>(this.config.url(`/api/v1/appointments/${id}`));
  }

  cancel(id: number): Observable<AppointmentDto | null> {
    return this.http.post<AppointmentDto | null>(this.config.url(`/api/v1/appointments/${id}/cancel`), {});
  }

  reschedule(id: number, request: RescheduleRequest): Observable<RescheduleResponse> {
    return this.http.post<RescheduleResponse>(this.config.url(`/api/v1/appointments/${id}/reschedule`), request);
  }
}
