import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

/** HU-012/013 cuerpo de `POST`/`PATCH /api/v1/professional/blocks` (hora local de Bogotá). */
export interface BlockRequest {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  locationCode: string;
}

/** HU-014 bloque propio del calendario. Sin datos de pacientes. */
export interface CalendarBlockDto {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  locationCode: string;
  locationName: string;
  totalSlots: number;
  committedSlots: number;
  editable: boolean;
}

/** Agenda aprobada del profesional (HU-023, Ola F); forma del controlador actual. */
export interface AgendaItemDto {
  id: number;
  startAt: string;
  endAt?: string;
  status?: string;
  specialtyName: string;
  locationCode?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

/** Acepta el nombre del contrato (`date`) o el del controlador actual (`availableDate`). */
function normalizeBlock(raw: CalendarBlockDto & { availableDate?: string }): CalendarBlockDto {
  return {
    ...raw,
    date: raw.date ?? raw.availableDate ?? '',
    totalSlots: raw.totalSlots ?? 0,
    committedSlots: raw.committedSlots ?? 0,
    editable: raw.editable ?? false,
  };
}

/** Cliente REST del rol `PROFESSIONAL`. El profesional se deriva del JWT. */
@Injectable({ providedIn: 'root' })
export class ProfessionalApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  private url(path: string): string {
    return this.config.url(`/api/v1/professional${path}`);
  }

  createBlock(request: BlockRequest): Observable<CalendarBlockDto> {
    return this.http.post<CalendarBlockDto>(this.url('/blocks'), request);
  }

  updateBlock(id: number, request: BlockRequest): Observable<CalendarBlockDto> {
    return this.http.patch<CalendarBlockDto>(this.url(`/blocks/${id}`), request);
  }

  deleteBlock(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/blocks/${id}`));
  }

  calendar(from: string, to: string, locationCode?: string | null): Observable<CalendarBlockDto[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (locationCode) params = params.set('locationCode', locationCode);
    return this.http
      .get<(CalendarBlockDto & { availableDate?: string })[]>(this.url('/calendar'), { params })
      .pipe(map((blocks) => blocks.map(normalizeBlock)));
  }

  agenda(from: string, to: string, locationCode?: string | null): Observable<AgendaItemDto[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (locationCode) params = params.set('locationCode', locationCode);
    return this.http.get<AgendaItemDto[]>(this.url('/agenda'), { params });
  }
}
