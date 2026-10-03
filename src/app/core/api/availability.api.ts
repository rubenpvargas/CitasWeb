import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

/** HU-015 `GET /api/v1/availability`: franjas reservables calculadas por el backend. */
export interface AvailabilitySlotDto {
  professionalId: number;
  professionalName: string;
  specialtyId: number;
  specialtyName: string;
  locationCode: string;
  locationName: string;
  startAt: string; // YYYY-MM-DDTHH:mm:ss (hora local de Bogotá)
  endAt: string;
  durationMinutes: number;
}

export interface AvailabilityQuery {
  specialtyId: number;
  from: string;
  to: string;
  locationCode?: string | null;
  professionalId?: number | null;
}

/** Ola D `POST /appointments/general`. */
export interface GeneralBookingRequest {
  professionalId: number;
  locationCode: string;
  startAt: string;
  reason?: string;
}

/** Ola D `POST /appointments/specialized`. */
export interface SpecializedBookingRequest extends GeneralBookingRequest {
  specialtyId: number;
}

export type AppointmentStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

/** Ola E `AppointmentDto` (calculado por el backend). */
export interface AppointmentDto {
  id: number;
  status: AppointmentStatus | string;
  locationCode: string;
  locationName: string;
  professionalId: number;
  professionalName: string;
  specialtyId: number;
  specialtyName: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  reason: string | null;
  rejectionReason: string | null;
  pendingReschedule: {
    id: number;
    requestedStartAt: string;
    requestedEndAt: string;
    locationCode: string;
  } | null;
  cancellable: boolean;
  reschedulable: boolean;
}

/** Cliente REST de disponibilidad y reservas del USER. */
@Injectable({ providedIn: 'root' })
export class AvailabilityApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  search(query: AvailabilityQuery): Observable<AvailabilitySlotDto[]> {
    let params = new HttpParams()
      .set('specialtyId', query.specialtyId)
      .set('from', query.from)
      .set('to', query.to);
    if (query.locationCode) params = params.set('locationCode', query.locationCode);
    if (query.professionalId) params = params.set('professionalId', query.professionalId);
    return this.http.get<AvailabilitySlotDto[]>(this.config.url('/api/v1/availability'), { params });
  }

  bookGeneral(request: GeneralBookingRequest): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(this.config.url('/api/v1/appointments/general'), request);
  }

  bookSpecialized(request: SpecializedBookingRequest): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(this.config.url('/api/v1/appointments/specialized'), request);
  }
}
