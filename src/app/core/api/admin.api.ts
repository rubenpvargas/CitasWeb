import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

/** HU-008 EPS (`/api/v1/admin/eps`). */
export interface EpsDto {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface EpsCreateRequest {
  code: string;
  name: string;
}

/** `PATCH /admin/eps/{id}` y `PATCH /admin/plans/{id}`. */
export interface CatalogUpdateRequest {
  name: string;
  active: boolean;
}

/**
 * HU-008 plan. Campos de régimen según el controlador actual
 * (`regimeId`, `regimeCode`, `regimeName`).
 */
export interface PlanDto {
  id: number;
  code: string;
  name: string;
  active: boolean;
  epsId: number;
  regimeId?: number;
  regimeCode?: string;
  regimeName?: string;
}

export interface PlanCreateRequest {
  regimeId: number;
  code: string;
  name: string;
}

/** HU-009 especialidad (ADMIN, incluye inactivas). */
export interface SpecialtyDto {
  id: number;
  code: string;
  name: string;
  durationMinutes: number;
  general: boolean;
  active: boolean;
}

export const SPECIALTY_DURATIONS = [30, 60] as const;

export interface SpecialtyCreateRequest {
  code: string;
  name: string;
  durationMinutes: number;
  general: boolean;
}

export interface SpecialtyUpdateRequest {
  name: string;
  durationMinutes: number;
  active: boolean;
}

/** `GET /api/v1/admin/locations`. */
export interface LocationDto {
  id: number;
  code: string;
  name: string;
  address?: string;
  city?: string;
  department?: string;
  active: boolean;
}

/**
 * HU-010 profesional. El contrato fija `{id, userId, firstName, lastName,
 * email, professionalCode, licenseNumber, active}`; las capacidades de la lista
 * no tienen nombre de campo en el contrato: se aceptan ids (`specialtyIds`,
 * `primarySpecialtyId`, `locationIds`) o los códigos del controlador actual
 * (`specialtyCodes`, `locationCodes`, como arreglo o cadena separada por comas).
 */
export interface ProfessionalDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  professionalCode: string;
  licenseNumber: string;
  active: boolean;
  phone?: string;
  specialtyIds?: number[];
  primarySpecialtyId?: number | null;
  locationIds?: number[];
  specialtyCodes?: string[] | string | null;
  locationCodes?: string[] | string | null;
}

/** `POST /api/v1/admin/professionals` (campos del `ProfessionalRequest` actual). */
export interface ProfessionalCreateRequest {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
  professionalCode: string;
  licenseNumber: string;
}

/** HU-011 `PUT /api/v1/admin/professionals/{id}/capabilities`. */
export interface CapabilitiesRequest {
  specialtyIds: number[];
  primarySpecialtyId: number;
  locationIds: number[];
  active: boolean;
}

/**
 * Elemento normalizado de la bandeja ADMIN. HU-025 devuelve
 * `{appointments:[REQUESTED], reschedules:[PENDING]}`; los nombres de campo
 * no fijados por el contrato siguen el controlador actual y la decisión
 * backend (`currentStartAt/currentEndAt`, `requestedStartAt/requestedEndAt`).
 */
export interface InboxItemDto {
  itemType: 'APPOINTMENT' | 'RESCHEDULE';
  id: number;
  status: string;
  /** Inicio de la cita o, en reprogramaciones, de la franja solicitada. */
  startAt: string;
  endAt?: string;
  specialtyName: string;
  locationCode: string;
  locationName?: string;
  professionalName?: string;
  patientName?: string;
  patientFirstName?: string;
  patientLastName?: string;
  appointmentId?: number;
  currentStartAt?: string;
  currentEndAt?: string;
  requestedStartAt?: string;
  requestedEndAt?: string;
}

export interface InboxFilters {
  locationCode?: string | null;
  professionalId?: number | null;
  specialtyId?: number | null;
  from?: string | null;
  to?: string | null;
}

type RawInboxItem = Partial<InboxItemDto> & Record<string, unknown>;

/** Acepta la forma del contrato (objeto) o la lista plana anterior. */
export function normalizeInbox(
  body: RawInboxItem[] | { appointments?: RawInboxItem[]; reschedules?: RawInboxItem[] } | null,
): InboxItemDto[] {
  if (!body) return [];
  if (Array.isArray(body)) return body.map((i) => toInboxItem(i, (i.itemType as InboxItemDto['itemType']) ?? 'APPOINTMENT'));
  return [
    ...(body.appointments ?? []).map((i) => toInboxItem(i, 'APPOINTMENT')),
    ...(body.reschedules ?? []).map((i) => toInboxItem(i, 'RESCHEDULE')),
  ];
}

function toInboxItem(raw: RawInboxItem, itemType: InboxItemDto['itemType']): InboxItemDto {
  const startAt = (itemType === 'RESCHEDULE' ? raw.requestedStartAt ?? raw.startAt : raw.startAt) ?? '';
  return {
    ...raw,
    itemType,
    id: Number(raw.id),
    status: raw.status ?? (itemType === 'RESCHEDULE' ? 'PENDING' : 'REQUESTED'),
    startAt,
    specialtyName: raw.specialtyName ?? '',
    locationCode: raw.locationCode ?? '',
    patientName: raw.patientName ?? (`${raw.patientFirstName ?? ''} ${raw.patientLastName ?? ''}`.trim() || undefined),
  };
}

/** Convierte códigos de capacidades en arreglo, venga como arreglo o como cadena "A,B". */
export function codeList(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(',').map((v) => v.trim()).filter(Boolean);
}

/** Cliente REST de administración (`ADMIN`). */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  private url(path: string): string {
    return this.config.url(`/api/v1/admin${path}`);
  }

  // HU-008 EPS y planes
  listEps(): Observable<EpsDto[]> {
    return this.http.get<EpsDto[]>(this.url('/eps'));
  }

  createEps(request: EpsCreateRequest): Observable<EpsDto> {
    return this.http.post<EpsDto>(this.url('/eps'), request);
  }

  updateEps(id: number, request: CatalogUpdateRequest): Observable<EpsDto> {
    return this.http.patch<EpsDto>(this.url(`/eps/${id}`), request);
  }

  listPlans(epsId: number): Observable<PlanDto[]> {
    return this.http.get<PlanDto[]>(this.url('/plans'), { params: { epsId } });
  }

  createPlan(epsId: number, request: PlanCreateRequest): Observable<PlanDto> {
    return this.http.post<PlanDto>(this.url(`/eps/${epsId}/plans`), request);
  }

  updatePlan(id: number, request: CatalogUpdateRequest): Observable<PlanDto> {
    return this.http.patch<PlanDto>(this.url(`/plans/${id}`), request);
  }

  // HU-009 especialidades
  listSpecialties(): Observable<SpecialtyDto[]> {
    return this.http.get<SpecialtyDto[]>(this.url('/specialties'));
  }

  createSpecialty(request: SpecialtyCreateRequest): Observable<SpecialtyDto> {
    return this.http.post<SpecialtyDto>(this.url('/specialties'), request);
  }

  updateSpecialty(id: number, request: SpecialtyUpdateRequest): Observable<SpecialtyDto> {
    return this.http.patch<SpecialtyDto>(this.url(`/specialties/${id}`), request);
  }

  // Sedes
  listLocations(): Observable<LocationDto[]> {
    return this.http.get<LocationDto[]>(this.url('/locations'));
  }

  // Bandeja administrativa (Ola D/F endurecerá este flujo)
  /** HU-025 `GET /admin/inbox?locationCode&professionalId&specialtyId&from&to`. */
  listInbox(filters: InboxFilters = {}): Observable<InboxItemDto[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http
      .get<Parameters<typeof normalizeInbox>[0]>(this.url('/inbox'), { params })
      .pipe(map((body) => normalizeInbox(body)));
  }

  /** HU-018 / HU-022: `{approve, reason}`; rechazar exige motivo (validado también por el backend). */
  decide(item: Pick<InboxItemDto, 'id' | 'itemType'>, approve: boolean, reason: string | null): Observable<unknown> {
    const path =
      item.itemType === 'RESCHEDULE' ? `/reschedules/${item.id}/decision` : `/appointments/${item.id}/decision`;
    return this.http.post(this.url(path), { approve, reason });
  }

  // HU-010 / HU-011 profesionales
  listProfessionals(): Observable<ProfessionalDto[]> {
    return this.http.get<ProfessionalDto[]>(this.url('/professionals'));
  }

  createProfessional(request: ProfessionalCreateRequest): Observable<ProfessionalDto> {
    return this.http.post<ProfessionalDto>(this.url('/professionals'), request);
  }

  updateCapabilities(id: number, request: CapabilitiesRequest): Observable<ProfessionalDto> {
    return this.http.put<ProfessionalDto>(this.url(`/professionals/${id}/capabilities`), request);
  }
}
